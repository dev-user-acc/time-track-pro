// src/routes/entries.js
// Маршруты временных записей.
'use strict';

const router = require('express').Router();
const {
    getEntries, getTodaySeconds, getWeekSeconds,
    getEntriesByRange, getAllEntries, createEntry, deleteEntry,
} = require('../controllers/entryController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate, schemas } = require('../middleware/validate');

// Все маршруты требуют аутентификации
router.use(authenticate);

/**
 * GET /api/entries/today
 * Суммарные секунды за сегодня.
 * Все авторизованные (только свои данные).
 *
 * Response 200: { totalSeconds, totalHours }
 */
router.get('/today', getTodaySeconds);

/**
 * GET /api/entries/week
 * Суммарные секунды за текущую неделю.
 * Все авторизованные.
 *
 * Response 200: { totalSeconds, totalHours, weekStart }
 */
router.get('/week', getWeekSeconds);

/**
 * GET /api/entries/range
 * Записи за произвольный диапазон дат.
 * Все авторизованные (только свои).
 *
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Response 200: { entries, totalSeconds }
 */
router.get('/range', getEntriesByRange);

/**
 * GET /api/entries/all
 * Все записи всех пользователей (для менеджера/администратора).
 * Только admin и manager.
 *
 * Query: ?limit=100
 * Response 200: { entries: ActivityEntry[] }
 */
router.get('/all', requireRole('admin', 'manager'), getAllEntries);

/**
 * GET /api/entries
 * Список записей текущего пользователя.
 * Все авторизованные.
 *
 * Query: ?limit=50
 * Response 200: { entries: TimeEntry[] }
 */
router.get('/', getEntries);

/**
 * POST /api/entries
 * Создание новой временной записи (после остановки таймера).
 * Все авторизованные.
 *
 * Body: { projectId, description?, startTime, endTime, durationSeconds }
 * Response 201: { entry }
 */
router.post('/', validate(schemas.createEntry), createEntry);

/**
 * DELETE /api/entries/:id
 * Удаление временной записи.
 * Сотрудник — только свои. Admin/manager — любые.
 *
 * Response 200: { message }
 */
router.delete('/:id', deleteEntry);

module.exports = router;
