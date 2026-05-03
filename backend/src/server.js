// src/server.js
// Точка входа: запускает HTTP-сервер и устанавливает соединение с БД.
// Обрабатывает graceful shutdown (SIGTERM/SIGINT) — не обрывает активные запросы.
'use strict';

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { pool } = require('./config/database');

const server = app.listen(env.port, () => {
    logger.info(`TimeTrack Pro API запущен`, {
        port: env.port,
        env: env.nodeEnv,
        pid: process.pid,
    });
});

// ─────────────────────────────────────────────
//  Graceful Shutdown
//  При получении SIGTERM (Kubernetes stop pod) или SIGINT (Ctrl+C):
//  1. Перестаём принимать новые запросы
//  2. Ждём завершения активных запросов (timeout 10 сек)
//  3. Закрываем пул БД
//  4. Завершаем процесс без ошибки
// ─────────────────────────────────────────────
const shutdown = async (signal) => {
    logger.info(`Получен сигнал ${signal}. Начинаем graceful shutdown...`);

    server.close(async () => {
        logger.info('HTTP сервер остановлен (новые запросы не принимаются)');

        try {
            await pool.end();
            logger.info('Пул PostgreSQL закрыт');
        } catch (err) {
            logger.error('Ошибка при закрытии пула БД', { message: err.message });
        }

        logger.info('Процесс завершён штатно');
        process.exit(0);
    });

    // Принудительно завершаем если shutdown занял больше 10 сек
    setTimeout(() => {
        logger.error('Shutdown timeout — принудительное завершение');
        process.exit(1);
    }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Ловим необработанные ошибки промисов — чтобы не упал весь процесс
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
    process.exit(1);
});
