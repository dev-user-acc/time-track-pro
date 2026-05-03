// src/app.js
// Конфигурация Express-приложения.
// Настройка middleware, маршрутов и глобального обработчика ошибок.
'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const logger = require('./utils/logger');
const { generalLimiter } = require('./middleware/rateLimiter');
const { AppError } = require('./utils/errors');

// Маршруты
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const entryRoutes = require('./routes/entries');
const reportRoutes = require('./routes/reports');

const app = express();

// ─────────────────────────────────────────────
//  Security headers (helmet)
//  Устанавливает: Content-Security-Policy, X-Frame-Options,
//  Strict-Transport-Security, X-Content-Type-Options и др.
// ─────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────
//  CORS
//  В production укажите конкретные origins вместо '*'
// ─────────────────────────────────────────────
app.use(cors({
    origin: env.nodeEnv === 'production'
        ? ['https://your-domain.com']   // заменить на реальный домен
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─────────────────────────────────────────────
//  Body parsing
// ─────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ─────────────────────────────────────────────
//  General rate limiting для всех /api/... маршрутов
// ─────────────────────────────────────────────
app.use('/api', generalLimiter);

// ─────────────────────────────────────────────
//  Request logging (структурированный лог каждого запроса)
// ─────────────────────────────────────────────
app.use((req, _res, next) => {
    logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    next();
});

// ─────────────────────────────────────────────
//  Health check — не требует авторизации, для load balancer/k8s
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
//  API маршруты
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/reports', reportRoutes);

// ─────────────────────────────────────────────
//  404 — маршрут не найден
// ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ status: 404, error: `Маршрут ${req.method} ${req.path} не существует` });
});

// ─────────────────────────────────────────────
//  Глобальный обработчик ошибок
//  Express вызывает его когда next(err) получает ошибку.
//  isOperational=true → ожидаемая ошибка (4xx), логируем как warn.
//  isOperational=false → баг (5xx), логируем как error + stack.
// ─────────────────────────────────────────────
app.use((err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational !== false;

    if (isOperational) {
        logger.warn('Операционная ошибка', {
            statusCode,
            message: err.message,
            path: req.path,
            userId: req.user?.id,
        });
    } else {
        logger.error('Непредвиденная ошибка', {
            statusCode,
            message: err.message,
            stack: err.stack,
            path: req.path,
            userId: req.user?.id,
        });
    }

    res.status(statusCode).json({
        status: statusCode,
        error: err.message || 'Внутренняя ошибка сервера',
        // stack только в development
        ...(env.nodeEnv === 'development' && { stack: err.stack }),
    });
});

module.exports = app;
