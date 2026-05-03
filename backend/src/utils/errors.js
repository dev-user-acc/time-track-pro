// src/utils/errors.js
// Классы HTTP-ошибок для единообразной обработки ошибок во всём приложении.
// Каждый контроллер выбрасывает эти классы — глобальный errorHandler их перехватывает.
'use strict';

/**
 * AppError — базовый класс HTTP-ошибки.
 * statusCode — HTTP-код ответа (400, 401, 403, 404, 409, 500).
 * isOperational — true значит ошибка ожидаемая (не баг), логируем как warn.
 */
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

/** 400 Bad Request — неверные входные данные */
class ValidationError extends AppError {
    constructor(message = 'Ошибка валидации данных') {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

/** 401 Unauthorized — не авторизован или токен истёк */
class UnauthorizedError extends AppError {
    constructor(message = 'Необходима авторизация') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

/** 403 Forbidden — недостаточно прав */
class ForbiddenError extends AppError {
    constructor(message = 'Доступ запрещён') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

/** 404 Not Found — ресурс не найден */
class NotFoundError extends AppError {
    constructor(message = 'Ресурс не найден') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

/** 409 Conflict — например, email уже занят */
class ConflictError extends AppError {
    constructor(message = 'Конфликт данных') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

module.exports = {
    AppError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
};
