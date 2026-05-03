// src/controllers/authController.js
// Контроллер аутентификации: регистрация, вход, обновление токена, выход.
//
// Безопасность:
//   - Пароли хэшируются bcrypt с cost=12 (намеренно медленный алгоритм)
//   - Access token живёт 15 мин, хранится в памяти на клиенте
//   - Refresh token живёт 30 дней, хранится в expo-secure-store
//   - Хэш refresh token'а сохраняется в БД для возможности отзыва
'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { ConflictError, UnauthorizedError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/** Хэшируем refresh token перед сохранением в БД — не храним сам токен */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * POST /api/auth/register
 * Регистрирует нового пользователя.
 * Проверяет уникальность email, хэширует пароль через bcrypt (cost=12).
 * Возвращает accessToken + refreshToken + данные пользователя.
 *
 * Body: { email, password, name, role? }
 * Response 201: { accessToken, refreshToken, user }
 */
const register = async (req, res, next) => {
    try {
        const { email, password, name, role } = req.body;

        // Проверяем уникальность email
        const existing = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        if (existing.rows.length > 0) {
            throw new ConflictError('Пользователь с таким email уже зарегистрирован');
        }

        // Хэшируем пароль — bcrypt автоматически генерирует уникальную соль
        const passwordHash = await bcrypt.hash(password, 12);

        // Случайный цвет аватара из палитры приложения
        const avatarColors = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7'];
        const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

        // Создаём пользователя
        const userResult = await db.query(
            `INSERT INTO users (email, password_hash, name, role, avatar_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, avatar_color, created_at`,
            [email.toLowerCase(), passwordHash, name, role || 'employee', avatarColor]
        );
        const user = userResult.rows[0];

        // Генерируем токены
        const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Сохраняем хэш refresh token в БД (для возможности отзыва)
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 дней
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
            [user.id, hashToken(refreshToken), expiresAt]
        );

        logger.info('Регистрация пользователя', { userId: user.id, email: user.email, role: user.role });

        res.status(201).json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatarColor: user.avatar_color,
                createdAt: user.created_at,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/login
 * Вход пользователя по email + password.
 * Использует bcrypt.compare — защита от timing attacks.
 * Возвращает accessToken + refreshToken + данные пользователя.
 *
 * Body: { email, password }
 * Response 200: { accessToken, refreshToken, user }
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Получаем пользователя из БД
        const result = await db.query(
            `SELECT id, email, name, role, avatar_color, password_hash, created_at
       FROM users WHERE email = $1`,
            [email.toLowerCase()]
        );

        const user = result.rows[0];

        // Сравниваем хэши — bcrypt.compare всегда занимает одинаковое время
        // (защита от timing-атак, когда по скорости ответа можно угадать email)
        const passwordValid = user
            ? await bcrypt.compare(password, user.password_hash)
            : await bcrypt.compare(password, '$2a$12$dummyhashfornonexistentuser00000'); // dummy сравнение

        if (!user || !passwordValid) {
            // Одно и то же сообщение — не раскрываем, что именно неверно
            throw new UnauthorizedError('Неверный email или пароль');
        }

        // Генерируем токены
        const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name });
        const refreshToken = generateRefreshToken({ id: user.id });

        // Удаляем старые refresh токены пользователя (ротация — предотвращаем утечку)
        await db.query(
            `DELETE FROM refresh_tokens WHERE user_id = $1 AND (expires_at < NOW() OR revoked = TRUE)`,
            [user.id]
        );

        // Сохраняем новый refresh token
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
            [user.id, hashToken(refreshToken), expiresAt]
        );

        logger.info('Вход пользователя', { userId: user.id, email: user.email });

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatarColor: user.avatar_color,
                createdAt: user.created_at,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/refresh
 * Обновляет пару токенов по refresh token (Refresh Token Rotation).
 * Старый refresh token инвалидируется, выдаётся новая пара.
 * Если refresh token уже использован — отзываем все токены пользователя (защита от replay attack).
 *
 * Body: { refreshToken }
 * Response 200: { accessToken, refreshToken }
 */
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        // Верифицируем подпись и срок действия
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch {
            throw new UnauthorizedError('Refresh token недействителен или истёк');
        }

        const tokenHash = hashToken(refreshToken);

        // Ищем токен в БД
        const tokenResult = await db.query(
            `SELECT id, user_id, expires_at, revoked
       FROM refresh_tokens WHERE token_hash = $1`,
            [tokenHash]
        );

        const storedToken = tokenResult.rows[0];

        if (!storedToken) {
            // Токен не найден — возможно уже использован (replay attack)
            // Отзываем ВСЕ refresh tokens данного пользователя
            await db.query(
                `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
                [decoded.id]
            );
            logger.warn('Попытка повторного использования refresh token', { userId: decoded.id });
            throw new UnauthorizedError('Refresh token уже был использован. Войдите заново');
        }

        if (storedToken.revoked || new Date(storedToken.expires_at) < new Date()) {
            throw new UnauthorizedError('Refresh token отозван или истёк');
        }

        // Получаем актуальные данные пользователя (роль могла измениться)
        const userResult = await db.query(
            `SELECT id, email, name, role FROM users WHERE id = $1`,
            [storedToken.user_id]
        );
        const user = userResult.rows[0];
        if (!user) throw new UnauthorizedError('Пользователь не найден');

        // Ротация: отзываем старый refresh token
        await db.query(
            `UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`,
            [storedToken.id]
        );

        // Генерируем новую пару токенов
        const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role, name: user.name });
        const newRefreshToken = generateRefreshToken({ id: user.id });

        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
            [user.id, hashToken(newRefreshToken), expiresAt]
        );

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/auth/logout
 * Выход пользователя: отзывает refresh token на сервере.
 * После этого даже при наличии токена сессия не возобновится.
 *
 * Body: { refreshToken }
 * Response 200: { message }
 */
const logout = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            const tokenHash = hashToken(refreshToken);
            await db.query(
                `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
                [tokenHash]
            );
        }

        logger.info('Выход пользователя', { userId: req.user?.id });

        res.json({ message: 'Выход выполнен успешно' });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refresh, logout };
