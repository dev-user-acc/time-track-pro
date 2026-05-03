// src/routes/projects.js
// Маршруты проектов.
'use strict';

const router = require('express').Router();
const {
    getProjects, getProjectById, createProject, updateProject, deleteProject,
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validate');

// Все маршруты требуют аутентификации
router.use(authenticate);

/**
 * GET /api/projects
 * Список проектов текущего пользователя.
 * Доступно всем авторизованным.
 *
 * Query: ?status=active|paused|completed|archived
 * Response 200: { projects: Project[] }
 */
router.get('/', getProjects);

/**
 * GET /api/projects/:id
 * Детали проекта (только собственный).
 * Доступно всем авторизованным.
 *
 * Response 200: { project }
 */
router.get('/:id', getProjectById);

/**
 * POST /api/projects
 * Создание нового проекта.
 * Только admin и manager.
 *
 * Body: { name, description?, color }
 * Response 201: { project }
 */
router.post('/', requireRole('admin', 'manager'), validate(schemas.createProject), createProject);

/**
 * PUT /api/projects/:id
 * Обновление проекта (название, описание, цвет, статус).
 * Только admin и manager. Только собственные проекты.
 *
 * Body: { name?, description?, color?, status? }
 * Response 200: { project }
 */
router.put('/:id', requireRole('admin', 'manager'), validate(schemas.updateProject), updateProject);

/**
 * DELETE /api/projects/:id
 * Удаление проекта с каскадным удалением записей.
 * Только admin и manager. Только собственные проекты.
 *
 * Response 200: { message }
 */
router.delete('/:id', requireRole('admin', 'manager'), deleteProject);

module.exports = router;
