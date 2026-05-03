// src/routes/auth.js
// Маршруты аутентификации.
// Строгий authLimiter: 5 попыток за 15 минут (защита от brute force).
'use strict';

const router = require('express').Router();
const { register, login, refresh, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../middleware/validate');

/**
 * POST /api/auth/register
 * Регистрация нового пользователя.
 * Открытый эндпоинт (без JWT), но со строгим rate limit.
 *
 * Body: { email, password, name, role? }
 * Response 201: { accessToken, refreshToken, user }
 */
router.post('/register', authLimiter, validate(schemas.register), register);

/**
 * POST /api/auth/login
 * Вход по email + password.
 * Открытый эндпоинт, строгий rate limit.
 *
 * Body: { email, password }
 * Response 200: { accessToken, refreshToken, user }
 */
router.post('/login', authLimiter, validate(schemas.login), login);

/**
 * POST /api/auth/refresh
 * Обновление пары токенов по refresh token.
 * Открытый эндпоинт (access token уже истёк — нечего верифицировать).
 *
 * Body: { refreshToken }
 * Response 200: { accessToken, refreshToken }
 */
router.post('/refresh', validate(schemas.refresh), refresh);

/**
 * POST /api/auth/logout
 * Выход: отзывает refresh token на сервере.
 * Требует авторизации (чтобы знать userId для логирования).
 *
 * Body: { refreshToken }
 * Response 200: { message }
 */
router.post('/logout', authenticate, logout);

module.exports = router;
