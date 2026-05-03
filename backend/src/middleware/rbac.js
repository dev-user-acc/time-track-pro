// src/middleware/rbac.js
// Role-Based Access Control (RBAC) middleware.
// Используется ПОСЛЕ authenticate — req.user уже заполнен.
//
// Иерархия ролей:
//   admin    → полный доступ ко всему
//   manager  → управление командой и проектами
//   employee → только собственные данные
'use strict';

const { ForbiddenError } = require('../utils/errors');

/**
 * requireRole(...roles)
 * Фабрика middleware: пропускает запрос только если роль пользователя
 * входит в список разрешённых ролей.
 *
 * Пример использования:
 *   router.get('/users', authenticate, requireRole('admin'), getUsers)
 *   router.get('/team',  authenticate, requireRole('admin', 'manager'), getTeam)
 *
 * @param {...string} roles — список разрешённых ролей
 * @returns {Function} middleware
 */
const requireRole = (...roles) => (req, _res, next) => {
    if (!req.user) {
        return next(new ForbiddenError('Пользователь не аутентифицирован'));
    }

    if (!roles.includes(req.user.role)) {
        return next(
            new ForbiddenError(
                `Доступ запрещён. Требуется роль: ${roles.join(' или ')}. Ваша роль: ${req.user.role}`
            )
        );
    }

    next();
};

/**
 * requireOwnerOrRole(paramKey, ...roles)
 * Пропускает запрос если:
 *   - req.params[paramKey] === req.user.id (владелец ресурса)
 *   - ИЛИ роль пользователя входит в список privileged roles
 *
 * Используется для операций типа "удалить запись":
 *   сотрудник может удалять только свои записи,
 *   admin/manager — любые.
 *
 * @param {string}    paramKey — название параметра из req.params (напр. 'userId')
 * @param {...string} roles    — привилегированные роли с доступом ко всем ресурсам
 * @returns {Function} middleware
 */
const requireOwnerOrRole = (paramKey, ...roles) => (req, _res, next) => {
    if (!req.user) {
        return next(new ForbiddenError('Пользователь не аутентифицирован'));
    }

    const isOwner = req.params[paramKey] === req.user.id;
    const isPrivileged = roles.includes(req.user.role);

    if (!isOwner && !isPrivileged) {
        return next(new ForbiddenError('Нет прав для операции с этим ресурсом'));
    }

    next();
};

module.exports = { requireRole, requireOwnerOrRole };
