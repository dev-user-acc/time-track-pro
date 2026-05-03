// src/utils/logger.js
// Структурированное логирование через Winston.
// В production — JSON-формат для ELK/Datadog.
// В development — цветной human-readable вывод.
'use strict';

const { createLogger, format, transports } = require('winston');
const env = require('../config/env');

const { combine, timestamp, printf, colorize, errors, json } = format;

// Формат для разработки: [2026-05-03 18:00:00] INFO: Сообщение { meta }
const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
    })
);

// Формат для production: структурированный JSON для машинного чтения
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

const logger = createLogger({
    level: env.log.level,
    format: env.nodeEnv === 'production' ? prodFormat : devFormat,
    transports: [
        new transports.Console(),
        // В production можно добавить транспорт в файл или logstash:
        // new transports.File({ filename: 'logs/error.log', level: 'error' }),
        // new transports.File({ filename: 'logs/combined.log' }),
    ],
    // Не крашим процесс при ошибке логирования
    exitOnError: false,
});

module.exports = logger;
