// src/utils/jwt.js
// Утилиты для работы с JWT-токенами.
//
// Используются два типа токенов:
//   accessToken  — короткоживущий (15 мин), передаётся в каждом запросе через Authorization: Bearer
//   refreshToken — долгоживущий (30 дней), хранится в expo-secure-store на клиенте,
//                  используется только для получения нового accessToken
'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * generateAccessToken(payload)
 * Создаёт короткоживущий JWT access token.
 * Payload содержит: id, email, role, name.
 * Срок действия: JWT_ACCESS_EXPIRES_IN (по умолчанию 15 минут).
 *
 * @param {{ id: string, email: string, role: string, name: string }} payload
 * @returns {string} подписанный JWT
 */
const generateAccessToken = (payload) =>
    jwt.sign(payload, env.jwt.accessSecret, {
        expiresIn: env.jwt.accessExpiresIn,
        issuer: 'timetrack-pro',
    });

/**
 * generateRefreshToken(payload)
 * Создаёт долгоживущий refresh token.
 * Payload содержит только: id (минимум данных по принципу least privilege).
 * Срок действия: JWT_REFRESH_EXPIRES_IN (по умолчанию 30 дней).
 *
 * @param {{ id: string }} payload
 * @returns {string} подписанный JWT
 */
const generateRefreshToken = (payload) =>
    jwt.sign({ id: payload.id }, env.jwt.refreshSecret, {
        expiresIn: env.jwt.refreshExpiresIn,
        issuer: 'timetrack-pro',
    });

/**
 * verifyAccessToken(token)
 * Верифицирует и декодирует access token.
 * Выбрасывает ошибку если токен истёк или подпись неверна.
 *
 * @param {string} token
 * @returns {{ id, email, role, name, iat, exp }} decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
const verifyAccessToken = (token) =>
    jwt.verify(token, env.jwt.accessSecret, { issuer: 'timetrack-pro' });

/**
 * verifyRefreshToken(token)
 * Верифицирует и декодирует refresh token.
 *
 * @param {string} token
 * @returns {{ id, iat, exp }} decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
const verifyRefreshToken = (token) =>
    jwt.verify(token, env.jwt.refreshSecret, { issuer: 'timetrack-pro' });

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
};
