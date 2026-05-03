// src/middleware/validate.js
// Middleware для валидации тела запроса через Zod-схемы.
// При ошибке валидации возвращает 400 с детальным описанием полей.
'use strict';

const { z } = require('zod');
const { ValidationError } = require('../utils/errors');

/**
 * validate(schema)
 * Фабрика middleware. Валидирует req.body против Zod-схемы.
 * При успехе перезаписывает req.body распарсенными данными (убирает лишние поля).
 * При ошибке передаёт ValidationError в next().
 *
 * @param {z.ZodSchema} schema
 * @returns {Function} middleware
 */
const validate = (schema) => (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const messages = result.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
        return next(new ValidationError(messages));
    }

    req.body = result.data; // только валидированные поля
    next();
};

// ─────────────────────────────────────────────
//  Zod-схемы для каждого запроса
// ─────────────────────────────────────────────

/** POST /auth/register */
const registerSchema = z.object({
    email: z.string().email('Некорректный email').toLowerCase(),
    password: z.string()
        .min(8, 'Пароль минимум 8 символов')
        .regex(/[A-Z]/, 'Пароль должен содержать заглавную букву')
        .regex(/[0-9]/, 'Пароль должен содержать цифру'),
    name: z.string().min(2, 'Имя минимум 2 символа').max(100),
    role: z.enum(['admin', 'manager', 'employee']).optional().default('employee'),
});

/** POST /auth/login */
const loginSchema = z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1, 'Пароль обязателен'),
});

/** POST /auth/refresh */
const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'refreshToken обязателен'),
});

/** POST /api/projects */
const createProjectSchema = z.object({
    name: z.string().min(1, 'Название обязательно').max(200),
    description: z.string().max(1000).optional().default(''),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет должен быть HEX #RRGGBB'),
});

/** PUT /api/projects/:id */
const updateProjectSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

/** POST /api/entries */
const createEntrySchema = z.object({
    projectId: z.string().uuid('projectId должен быть UUID'),
    description: z.string().max(500).optional().default(''),
    startTime: z.string().datetime('startTime должен быть ISO 8601'),
    endTime: z.string().datetime('endTime должен быть ISO 8601'),
    durationSeconds: z.number().int().min(0),
});

/** PUT /api/users/:id/role */
const updateRoleSchema = z.object({
    role: z.enum(['admin', 'manager', 'employee']),
});

module.exports = {
    validate,
    schemas: {
        register: registerSchema,
        login: loginSchema,
        refresh: refreshSchema,
        createProject: createProjectSchema,
        updateProject: updateProjectSchema,
        createEntry: createEntrySchema,
        updateRole: updateRoleSchema,
    },
};
