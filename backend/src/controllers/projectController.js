// src/controllers/projectController.js
// CRUD для проектов.
//
// Доступы по ролям:
//   getProjects       → все авторизованные (только свои проекты)
//   getProjectById    → все авторизованные (только свои)
//   createProject     → admin / manager
//   updateProject     → admin / manager
//   deleteProject     → admin / manager
'use strict';

const db = require('../config/database');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/projects
 * Список проектов текущего пользователя, отсортированных по дате обновления.
 * Сотрудник видит только свои проекты (где owner_id = req.user.id).
 *
 * Query: ?status=active|paused|completed|archived (опционально, фильтр)
 * Response 200: { projects: Project[] }
 */
const getProjects = async (req, res, next) => {
    try {
        const { status } = req.query;

        let query = `SELECT * FROM projects WHERE owner_id = $1`;
        const params = [req.user.id];

        if (status) {
            query += ` AND status = $2`;
            params.push(status);
        }

        query += ` ORDER BY updated_at DESC`;

        const result = await db.query(query, params);

        const projects = result.rows.map(rowToProject);
        res.json({ projects });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/projects/:id
 * Детали конкретного проекта.
 * Возвращает 404 если проект не найден или не принадлежит пользователю.
 *
 * Response 200: { project }
 */
const getProjectById = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT * FROM projects WHERE id = $1 AND owner_id = $2`,
            [req.params.id, req.user.id]
        );
        if (!result.rows[0]) throw new NotFoundError('Проект не найден');

        res.json({ project: rowToProject(result.rows[0]) });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/projects
 * Создание нового проекта.
 * Только admin и manager (проверяется в RBAC middleware).
 *
 * Body: { name, description?, color }
 * Response 201: { project }
 */
const createProject = async (req, res, next) => {
    try {
        const { name, description, color } = req.body;

        const result = await db.query(
            `INSERT INTO projects (name, description, color, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [name, description || '', color, req.user.id]
        );

        logger.info('Проект создан', { userId: req.user.id, projectId: result.rows[0].id, name });

        res.status(201).json({ project: rowToProject(result.rows[0]) });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/projects/:id
 * Обновление проекта (название, описание, цвет, статус).
 * Только admin и manager. Только собственные проекты.
 *
 * Body: { name?, description?, color?, status? }
 * Response 200: { project }
 */
const updateProject = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Проверяем что проект принадлежит текущему пользователю
        const existing = await db.query(
            `SELECT id FROM projects WHERE id = $1 AND owner_id = $2`,
            [id, req.user.id]
        );
        if (!existing.rows[0]) throw new NotFoundError('Проект не найден');

        // Динамически строим UPDATE только для переданных полей
        const { name, description, color, status } = req.body;
        const fields = [];
        const values = [];
        let counter = 1;

        if (name !== undefined) { fields.push(`name = $${counter++}`); values.push(name); }
        if (description !== undefined) { fields.push(`description = $${counter++}`); values.push(description); }
        if (color !== undefined) { fields.push(`color = $${counter++}`); values.push(color); }
        if (status !== undefined) { fields.push(`status = $${counter++}`); values.push(status); }

        if (fields.length === 0) {
            // Нечего обновлять — возвращаем текущий проект
            const current = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
            return res.json({ project: rowToProject(current.rows[0]) });
        }

        values.push(id);
        const result = await db.query(
            `UPDATE projects SET ${fields.join(', ')} WHERE id = $${counter} RETURNING *`,
            values
        );

        logger.info('Проект обновлён', { userId: req.user.id, projectId: id });

        res.json({ project: rowToProject(result.rows[0]) });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/projects/:id
 * Удаление проекта.
 * Каскадно удаляет все time_entries связанного проекта (ON DELETE CASCADE в схеме).
 * Только admin и manager. Только собственные проекты.
 *
 * Response 200: { message }
 */
const deleteProject = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id`,
            [id, req.user.id]
        );
        if (!result.rows[0]) throw new NotFoundError('Проект не найден');

        logger.info('Проект удалён', { userId: req.user.id, projectId: id });

        res.json({ message: 'Проект успешно удалён' });
    } catch (err) {
        next(err);
    }
};

/** Приводим строку из БД к объекту Project */
const rowToProject = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    status: row.status,
    ownerId: row.owner_id,
    totalSeconds: parseInt(row.total_seconds, 10),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

module.exports = { getProjects, getProjectById, createProject, updateProject, deleteProject };
