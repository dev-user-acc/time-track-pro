// src/controllers/reportController.js
// Аналитика и отчёты.
//
// Доступы по ролям:
//   getDashboard      → все (личная статистика)
//   getWeeklyReport   → все (личная статистика за 7 дней)
//   getTeamStats      → admin / manager (командная сводка)
//   getTeamActivity   → admin / manager (лента активности команды)
'use strict';

const db = require('../config/database');

/**
 * GET /api/reports/dashboard
 * Сводная статистика для главного экрана (DashboardScreen).
 * За один запрос возвращает: сегодня, неделя, последние 5 записей, список проектов.
 *
 * Response 200: { todaySeconds, weekSeconds, recentEntries, projects }
 */
const getDashboard = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const weekStart = new Date();
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1));
        weekStart.setHours(0, 0, 0, 0);

        // Параллельные запросы для минимальной задержки
        const [todayResult, weekResult, entriesResult, projectsResult] = await Promise.all([
            db.query(
                `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total
         FROM time_entries WHERE user_id = $1 AND start_time >= $2`,
                [userId, todayStart.toISOString()]
            ),
            db.query(
                `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total
         FROM time_entries WHERE user_id = $1 AND start_time >= $2`,
                [userId, weekStart.toISOString()]
            ),
            db.query(
                `SELECT * FROM time_entries WHERE user_id = $1
         ORDER BY start_time DESC LIMIT 5`,
                [userId]
            ),
            db.query(
                `SELECT * FROM projects WHERE owner_id = $1 ORDER BY updated_at DESC`,
                [userId]
            ),
        ]);

        res.json({
            todaySeconds: todayResult.rows[0].total,
            weekSeconds: weekResult.rows[0].total,
            recentEntries: entriesResult.rows.map(rowToEntry),
            projects: projectsResult.rows.map(rowToProject),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/reports/weekly
 * Детальный недельный отчёт для ReportsScreen.
 * Возвращает по-дневную разбивку за последние 7 дней и разбивку по проектам.
 *
 * Response 200: { chartData, totalSeconds, projectBreakdown, daysTracked, avgSeconds }
 */
const getWeeklyReport = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Формируем массив последних 7 дней
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            d.setHours(0, 0, 0, 0);
            return d;
        });

        const fromDate = days[0];
        const toDate = new Date(days[6]);
        toDate.setHours(23, 59, 59, 999);

        // Все записи за неделю за один запрос
        const entriesResult = await db.query(
            `SELECT * FROM time_entries
       WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3
       ORDER BY start_time DESC`,
            [userId, fromDate.toISOString(), toDate.toISOString()]
        );

        const entries = entriesResult.rows;

        // Группируем по дням
        const dailyMap = {};
        for (const day of days) {
            dailyMap[day.toISOString().split('T')[0]] = 0;
        }
        for (const e of entries) {
            const dateKey = new Date(e.start_time).toISOString().split('T')[0];
            if (dailyMap[dateKey] !== undefined) {
                dailyMap[dateKey] += parseInt(e.duration_seconds, 10);
            }
        }

        // Группируем по проектам
        const projectMap = {};
        for (const e of entries) {
            projectMap[e.project_name] = (projectMap[e.project_name] || 0) + parseInt(e.duration_seconds, 10);
        }

        const chartData = days.map((d) => ({
            date: d.toISOString(),
            day: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
            seconds: dailyMap[d.toISOString().split('T')[0]] || 0,
        }));

        const totalSeconds = Object.values(dailyMap).reduce((a, b) => a + b, 0);
        const daysTracked = chartData.filter((d) => d.seconds > 0).length;
        const avgSeconds = daysTracked > 0 ? Math.round(totalSeconds / daysTracked) : 0;
        const projectBreakdown = Object.entries(projectMap)
            .sort((a, b) => b[1] - a[1])
            .map(([name, seconds]) => ({ name, seconds }));

        res.json({ chartData, totalSeconds, daysTracked, avgSeconds, projectBreakdown });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/reports/team
 * Командная сводная статистика для ManagerTeamScreen.
 * По каждому пользователю: имя, роль, суммарные часы, кол-во записей.
 * Только admin и manager.
 *
 * Response 200: { users: TeamMember[], summary: { totalUsers, totalSeconds, totalEntries } }
 */
const getTeamStats = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.avatar_color,
         COALESCE(SUM(te.duration_seconds), 0)::int  AS total_seconds,
         COUNT(te.id)::int                            AS entry_count,
         COUNT(DISTINCT te.project_id)::int           AS project_count
       FROM users u
       LEFT JOIN time_entries te ON te.user_id = u.id
       GROUP BY u.id, u.name, u.email, u.role, u.avatar_color
       ORDER BY total_seconds DESC`
        );

        const users = result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            avatarColor: row.avatar_color,
            totalSeconds: row.total_seconds,
            totalHours: parseFloat((row.total_seconds / 3600).toFixed(2)),
            entryCount: row.entry_count,
            projectCount: row.project_count,
        }));

        const summary = {
            totalUsers: users.length,
            totalSeconds: users.reduce((s, u) => s + u.totalSeconds, 0),
            totalEntries: users.reduce((s, u) => s + u.entryCount, 0),
        };
        summary.totalHours = parseFloat((summary.totalSeconds / 3600).toFixed(2));

        res.json({ users, summary });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/reports/team/activity
 * Лента последней активности всех пользователей.
 * Последние N записей со всех пользователей с именем сотрудника.
 * Только admin и manager.
 *
 * Query: ?limit=30
 * Response 200: { entries: ActivityEntry[] }
 */
const getTeamActivity = async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '30', 10), 200);

        const result = await db.query(
            `SELECT
         te.*,
         u.name         AS user_name,
         u.role         AS user_role,
         u.avatar_color AS user_avatar_color
       FROM time_entries te
       JOIN users u ON u.id = te.user_id
       ORDER BY te.start_time DESC
       LIMIT $1`,
            [limit]
        );

        const entries = result.rows.map((row) => ({
            ...rowToEntry(row),
            userName: row.user_name,
            userRole: row.user_role,
            userAvatarColor: row.user_avatar_color,
        }));

        res.json({ entries });
    } catch (err) {
        next(err);
    }
};

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

const rowToProject = (row) => ({
    id: row.id, name: row.name, description: row.description,
    color: row.color, status: row.status, ownerId: row.owner_id,
    totalSeconds: parseInt(row.total_seconds, 10),
    createdAt: row.created_at, updatedAt: row.updated_at,
});

module.exports = { getDashboard, getWeeklyReport, getTeamStats, getTeamActivity };
