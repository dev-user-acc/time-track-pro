// src/middleware/auth.js
// Middleware аутентификации через JWT.
// Проверяет наличие и валидность Bearer-токена в заголовке Authorization.
// При успехе добавляет req.user = { id, email, role, name }.
'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');

/**
 * authenticate
 * Извлекает JWT из заголовка `Authorization: Bearer <token>`,
 * верифицирует подпись и срок действия.
 * Если токен валидный — добавляет req.user и передаёт управление дальше.
 * Если токен отсутствует или истёк — отвечает 401.
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Токен не передан. Используйте Authorization: Bearer <token>'));
    }

    const token = authHeader.slice(7); // убираем "Bearer "

    try {
        // verifyAccessToken выбросит ошибку если токен истёк или подпись неверна
        const decoded = verifyAccessToken(token);
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
        };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Токен истёк. Выполните refresh'));
        }
        return next(new UnauthorizedError('Некорректный токен'));
    }
};

module.exports = { authenticate };
