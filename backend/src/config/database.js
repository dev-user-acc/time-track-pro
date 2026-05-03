// src/config/database.js
// Singleton-пул соединений PostgreSQL через библиотеку 'pg'.
// Весь приложение работает через один pool — не создаёт лишних соединений.
'use strict';

const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

// Pool автоматически управляет пулом: min=2, max=10 соединений.
// При бездействии соединения возвращаются в pool, не закрываются.
const pool = new Pool({
    host: env.db.host,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
    max: 10,   // максимум одновременных соединений
    idleTimeoutMillis: 30_000, // закрыть простаивающее соединение через 30 сек
    connectionTimeoutMillis: 5_000, // ошибка если не подключились за 5 сек
    ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: true } : false,
});

// Логируем каждое новое соединение и ошибки пула
pool.on('connect', () => {
    logger.debug('PostgreSQL: новое соединение из пула');
});

pool.on('error', (err) => {
    logger.error('PostgreSQL pool error', { message: err.message });
});

/**
 * query(text, params)
 * Основной метод для параметризованных SQL-запросов.
 * Все значения передаются через params[] — защита от SQL-инъекций.
 *
 * @param {string} text   — SQL-запрос с плейсхолдерами $1, $2, ...
 * @param {Array}  params — массив значений
 * @returns {Promise<QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * getClient()
 * Получить клиент из пула для транзакций (BEGIN / COMMIT / ROLLBACK).
 * После работы обязательно вызвать client.release().
 *
 * @returns {Promise<PoolClient>}
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
