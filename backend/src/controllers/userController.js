// src/controllers/userController.js
// Управление пользователями.
//
// Доступы по ролям:
//   getMe           → все авторизованные
//   getAllUsers      → только admin
//   getUserById      → admin / manager
//   updateUserRole   → только admin (нельзя менять свою роль)
//   getUserStats     → admin / manager
'use strict';

const db = require('../config/database');
const { NotFoundError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * GET /api/users/me
 * Возвращает данные текущего авторизованного пользователя.
 * Данные берутся из БД (актуальная роль, не из token payload).
 *
 * Response 200: { user }
 */
const getMe = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, email, name, role, avatar_color, created_at
       FROM users WHERE id = $1`,
            [req.user.id]
        );
        if (!result.rows[0]) throw new NotFoundError('Пользователь не найден');

        const u = result.rows[0];
        res.json({
            user: {
                id: u.id, email: u.email, name: u.name,
                role: u.role, avatarColor: u.avatar_color, createdAt: u.created_at,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/users
 * Список всех пользователей системы.
 * Доступно только администратору.
 * Используется на экране AdminUsersScreen.
 *
 * Response 200: { users: User[] }
 */
const getAllUsers = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, email, name, role, avatar_color, created_at
       FROM users ORDER BY created_at ASC`
        );

        const users = result.rows.map((u) => ({
            id: u.id, email: u.email, name: u.name,
            role: u.role, avatarColor: u.avatar_color, createdAt: u.created_at,
        }));

        res.json({ users });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/users/:id
 * Карточка конкретного пользователя.
 * Доступно admin и manager.
 *
 * Response 200: { user }
 */
const getUserById = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, email, name, role, avatar_color, created_at
       FROM users WHERE id = $1`,
            [req.params.id]
        );
        if (!result.rows[0]) throw new NotFoundError('Пользователь не найден');

        const u = result.rows[0];
        res.json({
            user: {
                id: u.id, email: u.email, name: u.name,
                role: u.role, avatarColor: u.avatar_color, createdAt: u.created_at,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/users/:id/role
 * Смена роли пользователя.
 * Доступно только администратору.
 * Защита: нельзя сменить собственную роль.
 *
 * Body: { role: 'admin' | 'manager' | 'employee' }
 * Response 200: { user }
 */
const updateUserRole = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Администратор не может изменить свою собственную роль
        if (id === req.user.id) {
            throw new ForbiddenError('Нельзя изменить собственную роль');
        }

        const result = await db.query(
            `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, email, name, role, avatar_color, created_at`,
            [role, id]
        );
        if (!result.rows[0]) throw new NotFoundError('Пользователь не найден');

        logger.info('Роль пользователя изменена', {
            adminId: req.user.id, targetUserId: id, newRole: role,
        });

        const u = result.rows[0];
        res.json({
            user: {
                id: u.id, email: u.email, name: u.name,
                role: u.role, avatarColor: u.avatar_color, createdAt: u.created_at,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/users/:id/stats
 * Статистика пользователя: суммарные секунды и количество уникальных проектов.
 * Используется в AdminUsersScreen и ManagerTeamScreen для карточек сотрудников.
 * Доступно admin и manager.
 *
 * Response 200: { totalSeconds, projectCount, totalHours }
 */
const getUserStats = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [timeResult, projectResult] = await Promise.all([
            db.query(
                `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total
         FROM time_entries WHERE user_id = $1`,
                [id]
            ),
            db.query(
                `SELECT COUNT(DISTINCT project_id)::int AS cnt
         FROM time_entries WHERE user_id = $1`,
                [id]
            ),
        ]);

        const totalSeconds = timeResult.rows[0].total;
        const projectCount = projectResult.rows[0].cnt;

        res.json({
            totalSeconds,
            totalHours: parseFloat((totalSeconds / 3600).toFixed(2)),
            projectCount,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getMe, getAllUsers, getUserById, updateUserRole, getUserStats };
