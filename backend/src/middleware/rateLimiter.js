// src/middleware/rateLimiter.js
// Rate limiting — ограничение частоты запросов для защиты от brute force и DDoS.
// Используется express-rate-limit с in-memory хранилищем (достаточно для одного инстанса).
// В production с несколькими репликами — заменить на redis-rate-limit.
'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * generalLimiter
 * Применяется ко всем API-маршрутам.
 * По умолчанию: 100 запросов за 15 минут с одного IP.
 * При превышении → 429 Too Many Requests.
 */
const generalLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,  // добавляет заголовки RateLimit-*
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'Слишком много запросов. Попробуйте позже.',
    },
    // keyGenerator по умолчанию использует req.ip
});

/**
 * authLimiter
 * Строгий лимит для эндпоинтов аутентификации (/auth/login, /auth/register).
 * По умолчанию: 5 попыток за 15 минут с одного IP.
 * Защита от brute force атак на пароли.
 */
const authLimiter = rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'Слишком много попыток входа. Попробуйте через 15 минут.',
    },
    skipSuccessfulRequests: true, // не считаем успешные логины
});

module.exports = { generalLimiter, authLimiter };
