// src/routes/reports.js
// Маршруты аналитики и отчётов.
'use strict';

const router = require('express').Router();
const {
    getDashboard, getWeeklyReport, getTeamStats, getTeamActivity,
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Все маршруты требуют аутентификации
router.use(authenticate);

/**
 * GET /api/reports/dashboard
 * Сводная статистика для DashboardScreen.
 * Сегодня/неделя + последние 5 записей + список проектов.
 * Все авторизованные (личные данные).
 *
 * Response 200: { todaySeconds, weekSeconds, recentEntries, projects }
 */
router.get('/dashboard', getDashboard);

/**
 * GET /api/reports/weekly
 * Детальный отчёт за 7 дней для ReportsScreen.
 * По-дневная разбивка + разбивка по проектам.
 * Все авторизованные (личные данные).
 *
 * Response 200: { chartData, totalSeconds, daysTracked, avgSeconds, projectBreakdown }
 */
router.get('/weekly', getWeeklyReport);

/**
 * GET /api/reports/team
 * Командная сводка: все пользователи с их суммарными часами.
 * Только admin и manager. Используется на ManagerTeamScreen.
 *
 * Response 200: { users: TeamMember[], summary }
 */
router.get('/team', requireRole('admin', 'manager'), getTeamStats);

/**
 * GET /api/reports/team/activity
 * Лента последней активности команды.
 * Только admin и manager.
 *
 * Query: ?limit=30
 * Response 200: { entries: ActivityEntry[] }
 */
router.get('/team/activity', requireRole('admin', 'manager'), getTeamActivity);

module.exports = router;
