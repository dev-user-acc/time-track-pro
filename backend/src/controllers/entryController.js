// src/controllers/entryController.js
// CRUD для временных записей (time entries).
//
// Доступы по ролям:
//   getEntries        → все (только свои записи)
//   getTodaySeconds   → все (только свои)
//   getWeekSeconds    → все (только свои)
//   getEntriesByRange → все (только свои)
//   getAllEntries      → admin / manager (все пользователи)
//   createEntry       → все авторизованные
//   deleteEntry       → владелец / admin / manager
'use strict';

const db = require('../config/database');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/entries
 * Список временных записей текущего пользователя.
 * Отсортированы по start_time DESC (newer first).
 *
 * Query: ?limit=50 (опционально, по умолчанию 50, максимум 200)
 * Response 200: { entries: TimeEntry[] }
 */
const getEntries = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);

        const result = await db.query(
            `SELECT * FROM time_entries
       WHERE user_id = $1
       ORDER BY start_time DESC
       LIMIT $2`,
            [req.user.id, limit]
        );

        res.json({ entries: result.rows.map(rowToEntry) });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/entries/today
 * Суммарное количество секунд, отработанных сегодня текущим пользователем.
 * Используется на DashboardScreen для карточки "Сегодня".
 *
 * Response 200: { totalSeconds, totalHours }
 */
const getTodaySeconds = async (req, res, next) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const result = await db.query(
            `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total
       FROM time_entries
       WHERE user_id = $1 AND start_time >= $2`,
            [req.user.id, todayStart.toISOString()]
        );

        const totalSeconds = result.rows[0].total;
        res.json({
            totalSeconds,
            totalHours: parseFloat((totalSeconds / 3600).toFixed(2)),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/entries/week
 * Суммарное количество секунд за текущую неделю (пн-вс).
 * Используется на DashboardScreen для карточки "Неделя".
 *
 * Response 200: { totalSeconds, totalHours, weekStart }
 */
const getWeekSeconds = async (req, res, next) => {
    try {
        const weekStart = new Date();
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // пн=1
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);

        const result = await db.query(
            `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total
       FROM time_entries
       WHERE user_id = $1 AND start_time >= $2`,
            [req.user.id, weekStart.toISOString()]
        );

        const totalSeconds = result.rows[0].total;
        res.json({
            totalSeconds,
            totalHours: parseFloat((totalSeconds / 3600).toFixed(2)),
            weekStart: weekStart.toISOString(),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/entries/range
 * Записи пользователя за произвольный диапазон дат.
 * Используется в ReportsScreen для аналитики.
 *
 * Query: ?from=2026-05-01&to=2026-05-07 (ISO 8601 date strings)
 * Response 200: { entries: TimeEntry[], totalSeconds }
 */
const getEntriesByRange = async (req, res, next) => {
    try {
        const { from, to } = req.query;

        const fromDate = from ? new Date(from + 'T00:00:00.000Z') : new Date(Date.now() - 7 * 86400_000);
        const toDate = to ? new Date(to + 'T23:59:59.999Z') : new Date();

        const result = await db.query(
            `SELECT * FROM time_entries
       WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3
       ORDER BY start_time DESC`,
            [req.user.id, fromDate.toISOString(), toDate.toISOString()]
        );

        const entries = result.rows.map(rowToEntry);
        const totalSeconds = entries.reduce((sum, e) => sum + e.durationSeconds, 0);

        res.json({ entries, totalSeconds });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/entries/all
 * Все записи ВСЕХ пользователей (последние N записей).
 * Только admin и manager. Используется на ManagerTeamScreen (лента активности).
 *
 * Query: ?limit=100
 * Response 200: { entries: TimeEntry[] }
 */
const getAllEntries = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);

        const result = await db.query(
            `SELECT te.*, u.name AS user_name, u.avatar_color AS user_avatar_color
       FROM time_entries te
       JOIN users u ON u.id = te.user_id
       ORDER BY te.start_time DESC
       LIMIT $1`,
            [limit]
        );

        const entries = result.rows.map((row) => ({
            ...rowToEntry(row),
            userName: row.user_name,
            userAvatarColor: row.user_avatar_color,
        }));

        res.json({ entries });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/entries
 * Создание новой временной записи после остановки таймера.
 * Автоматически обновляет total_seconds у связанного проекта.
 *
 * Body: { projectId, description?, startTime, endTime, durationSeconds }
 * Response 201: { entry }
 */
const createEntry = async (req, res, next) => {
    try {
        const { projectId, description, startTime, endTime, durationSeconds } = req.body;

        // Атомарная транзакция: INSERT entry + UPDATE project total_seconds
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Получаем данные проекта для денормализации
            const projResult = await client.query(
                `SELECT id, name, color FROM projects WHERE id = $1 AND owner_id = $2`,
                [projectId, req.user.id]
            );
            if (!projResult.rows[0]) {
                await client.query('ROLLBACK');
                throw new NotFoundError('Проект не найден или нет доступа');
            }

            const project = projResult.rows[0];

            // Создаём запись
            const entryResult = await client.query(
                `INSERT INTO time_entries
           (user_id, project_id, project_name, project_color, description, start_time, end_time, duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
                [
                    req.user.id, projectId, project.name, project.color,
                    description || '', startTime, endTime, durationSeconds,
                ]
            );

            // Обновляем суммарное время проекта
            await client.query(
                `UPDATE projects
         SET total_seconds = (
           SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entries
           WHERE project_id = $1 AND user_id = $2
         )
         WHERE id = $1`,
                [projectId, req.user.id]
            );

            await client.query('COMMIT');

            logger.info('Временная запись создана', {
                userId: req.user.id, projectId, durationSeconds,
            });

            res.status(201).json({ entry: rowToEntry(entryResult.rows[0]) });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/entries/:id
 * Удаление временной записи.
 * Сотрудник может удалять только свои записи.
 * Admin и manager могут удалять любые.
 * После удаления пересчитывает total_seconds у проекта.
 *
 * Response 200: { message }
 */
const deleteEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const role = req.user.role;

        // Находим запись — проверяем существование
        const entryResult = await db.query(
            `SELECT id, user_id, project_id FROM time_entries WHERE id = $1`,
            [id]
        );
        const entry = entryResult.rows[0];
        if (!entry) throw new NotFoundError('Запись не найдена');

        // Проверяем права: только владелец или привилегированная роль
        if (entry.user_id !== req.user.id && role !== 'admin' && role !== 'manager') {
            throw new ForbiddenError('Нет прав для удаления этой записи');
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            await client.query(`DELETE FROM time_entries WHERE id = $1`, [id]);

            // Пересчитываем суммарное время проекта
            await client.query(
                `UPDATE projects
         SET total_seconds = (
           SELECT COALESCE(SUM(duration_seconds), 0) FROM time_entries
           WHERE project_id = $1 AND user_id = $2
         )
         WHERE id = $1`,
                [entry.project_id, entry.user_id]
            );

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        logger.info('Временная запись удалена', { userId: req.user.id, entryId: id });

        res.json({ message: 'Запись удалена' });
    } catch (err) {
        next(err);
    }
};

/** Приводим строку из БД к объекту TimeEntry */
const rowToEntry = (row) => ({
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    projectName: row.project_name,
    projectColor: row.project_color,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    durationSeconds: parseInt(row.duration_seconds, 10),
    createdAt: row.created_at,
});

module.exports = {
    getEntries,
    getTodaySeconds,
    getWeekSeconds,
    getEntriesByRange,
    getAllEntries,
    createEntry,
    deleteEntry,
};
