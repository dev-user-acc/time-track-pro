// src/config/env.js
// Централизованная валидация переменных окружения при старте сервера.
// Если обязательная переменная отсутствует — сервер не запускается.
'use strict';

require('dotenv').config();

const required = [
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
];

for (const key of required) {
    if (!process.env[key]) {
        console.error(`[ENV] Обязательная переменная окружения "${key}" не задана. Запуск отменён.`);
        process.exit(1);
    }
}

module.exports = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    db: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },

    log: {
        level: process.env.LOG_LEVEL || 'info',
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10),
    },
};
