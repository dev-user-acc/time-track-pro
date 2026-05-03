// src/db/migrate.js
// Запускает SQL-схему против PostgreSQL-базы данных.
// Использование: node src/db/migrate.js
// Безопасен для повторного запуска — все CREATE используют IF NOT EXISTS.
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function migrate() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    logger.info('Запуск миграции базы данных...');

    const client = await pool.connect();
    try {
        // Выполняем весь файл в одной транзакции — либо всё, либо ничего
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        logger.info('Миграция успешно завершена.');
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Ошибка во время миграции — откат транзакции', { error: err.message });
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
