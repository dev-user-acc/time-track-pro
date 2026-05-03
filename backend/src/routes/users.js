// src/routes/users.js
// Маршруты управления пользователями.
'use strict';

const router = require('express').Router();
const { getMe, getAllUsers, getUserById, updateUserRole, getUserStats } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validate');

// Все маршруты требуют аутентификации
router.use(authenticate);

/**
 * GET /api/users/me
 * Данные текущего пользователя (из БД, всегда актуальная роль).
 * Доступно всем авторизованным пользователям.
 *
 * Response 200: { user }
 */
router.get('/me', getMe);

/**
 * GET /api/users
 * Список всех пользователей системы.
 * Только администратор.
 *
 * Response 200: { users: User[] }
 */
router.get('/', requireRole('admin'), getAllUsers);

/**
 * GET /api/users/:id
 * Карточка конкретного пользователя.
 * Admin и manager (для просмотра данных сотрудников).
 *
 * Response 200: { user }
 */
router.get('/:id', requireRole('admin', 'manager'), getUserById);

/**
 * PUT /api/users/:id/role
 * Изменение роли пользователя.
 * Только администратор. Нельзя изменить собственную роль.
 *
 * Body: { role: 'admin' | 'manager' | 'employee' }
 * Response 200: { user }
 */
router.put('/:id/role', requireRole('admin'), validate(schemas.updateRole), updateUserRole);

/**
 * GET /api/users/:id/stats
 * Статистика пользователя: суммарные часы и кол-во проектов.
 * Admin и manager.
 *
 * Response 200: { totalSeconds, totalHours, projectCount }
 */
router.get('/:id/stats', requireRole('admin', 'manager'), getUserStats);

module.exports = router;
