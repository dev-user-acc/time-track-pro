# TimeTrack Pro — Backend API

REST API на Node.js + PostgreSQL для мобильного приложения TimeTrack Pro.

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать и заполнить .env
cp .env.example .env

# 3. Применить схему базы данных
npm run migrate

# 4. Запустить сервер
npm run dev       # разработка (nodemon)
npm start         # production
```

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `PORT` | Порт сервера | `3000` |
| `DB_HOST` | Хост PostgreSQL | `localhost` |
| `DB_PORT` | Порт PostgreSQL | `5432` |
| `DB_NAME` | Имя базы данных | `timetrack_pro` |
| `DB_USER` | Пользователь БД | `postgres` |
| `DB_PASSWORD` | Пароль БД | `secret` |
| `JWT_ACCESS_SECRET` | Секрет для access token (мин. 64 символа) | `...` |
| `JWT_REFRESH_SECRET` | Секрет для refresh token (мин. 64 символа) | `...` |
| `JWT_ACCESS_EXPIRES_IN` | Срок жизни access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Срок жизни refresh token | `30d` |
| `LOG_LEVEL` | Уровень логирования | `info` |

Генерировать секреты:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Структура проекта

```
src/
├── config/
│   ├── env.js          # Валидация и экспорт env-переменных
│   └── database.js     # PostgreSQL connection pool (Singleton)
├── db/
│   ├── schema.sql      # DDL: таблицы, индексы, триггеры
│   └── migrate.js      # Скрипт применения схемы
├── middleware/
│   ├── auth.js         # JWT Bearer-верификация → req.user
│   ├── rbac.js         # requireRole() / requireOwnerOrRole()
│   ├── rateLimiter.js  # generalLimiter + authLimiter
│   └── validate.js     # Zod-валидация req.body + схемы
├── controllers/
│   ├── authController.js     # register, login, refresh, logout
│   ├── userController.js     # getMe, getAllUsers, updateRole, stats
│   ├── projectController.js  # CRUD проектов
│   ├── entryController.js    # CRUD временных записей
│   └── reportController.js   # dashboard, weekly, team stats
├── routes/
│   ├── auth.js       # /api/auth/*
│   ├── users.js      # /api/users/*
│   ├── projects.js   # /api/projects/*
│   ├── entries.js    # /api/entries/*
│   └── reports.js    # /api/reports/*
├── utils/
│   ├── logger.js     # Winston: JSON (prod) / colorized (dev)
│   ├── jwt.js        # generateAccessToken, verifyAccessToken, ...
│   └── errors.js     # AppError, ValidationError, ForbiddenError, ...
├── app.js            # Express: middleware + маршруты + error handler
└── server.js         # HTTP-сервер + graceful shutdown
```

---

## API Reference

### Аутентификация

| Метод | Маршрут | Описание | Доступ |
|---|---|---|---|
| POST | `/api/auth/register` | Регистрация | — |
| POST | `/api/auth/login` | Вход | — |
| POST | `/api/auth/refresh` | Обновление токенов | — |
| POST | `/api/auth/logout` | Выход | JWT |

#### POST /api/auth/register
```json
// Request body
{
  "email": "ivan@company.ru",
  "password": "Secret123",
  "name": "Иван Петров",
  "role": "employee"   // опционально: admin | manager | employee
}

// Response 201
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": {
    "id": "uuid",
    "email": "ivan@company.ru",
    "name": "Иван Петров",
    "role": "employee",
    "avatarColor": "#00d4ff",
    "createdAt": "2026-05-03T18:00:00Z"
  }
}
```

#### POST /api/auth/login
```json
// Request body
{ "email": "ivan@company.ru", "password": "Secret123" }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ...", "user": {...} }
```

#### POST /api/auth/refresh
```json
// Request body
{ "refreshToken": "eyJ..." }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### POST /api/auth/logout
```
Authorization: Bearer <accessToken>
Body: { "refreshToken": "eyJ..." }

Response 200: { "message": "Выход выполнен успешно" }
```

---

### Пользователи

| Метод | Маршрут | Описание | Роль |
|---|---|---|---|
| GET | `/api/users/me` | Мои данные | all |
| GET | `/api/users` | Все пользователи | admin |
| GET | `/api/users/:id` | Пользователь по ID | admin, manager |
| PUT | `/api/users/:id/role` | Сменить роль | admin |
| GET | `/api/users/:id/stats` | Статистика пользователя | admin, manager |

#### PUT /api/users/:id/role
```json
// Request body
{ "role": "manager" }  // admin | manager | employee

// Response 200
{ "user": { "id": "...", "role": "manager", ... } }
```

#### GET /api/users/:id/stats
```json
// Response 200
{
  "totalSeconds": 36000,
  "totalHours": 10.0,
  "projectCount": 3
}
```

---

### Проекты

| Метод | Маршрут | Описание | Роль |
|---|---|---|---|
| GET | `/api/projects` | Мои проекты | all |
| GET | `/api/projects/:id` | Проект по ID | all |
| POST | `/api/projects` | Создать проект | admin, manager |
| PUT | `/api/projects/:id` | Обновить проект | admin, manager |
| DELETE | `/api/projects/:id` | Удалить проект | admin, manager |

#### POST /api/projects
```json
// Request body
{
  "name": "Редизайн сайта",
  "description": "Переработка UI/UX",
  "color": "#8b5cf6"
}

// Response 201
{
  "project": {
    "id": "uuid",
    "name": "Редизайн сайта",
    "description": "Переработка UI/UX",
    "color": "#8b5cf6",
    "status": "active",
    "ownerId": "uuid",
    "totalSeconds": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### PUT /api/projects/:id
```json
// Все поля опциональны
{
  "status": "completed",
  "name": "Новое название"
}
```

---

### Временные записи

| Метод | Маршрут | Описание | Роль |
|---|---|---|---|
| GET | `/api/entries` | Мои записи | all |
| GET | `/api/entries/today` | Секунды сегодня | all |
| GET | `/api/entries/week` | Секунды за неделю | all |
| GET | `/api/entries/range` | Записи за диапазон | all |
| GET | `/api/entries/all` | Все записи всех | admin, manager |
| POST | `/api/entries` | Создать запись | all |
| DELETE | `/api/entries/:id` | Удалить запись | owner / admin / manager |

#### POST /api/entries
```json
// Request body
{
  "projectId": "uuid",
  "description": "Верстка главной страницы",
  "startTime": "2026-05-03T09:00:00.000Z",
  "endTime": "2026-05-03T11:30:00.000Z",
  "durationSeconds": 9000
}

// Response 201
{
  "entry": {
    "id": "uuid",
    "userId": "uuid",
    "projectId": "uuid",
    "projectName": "Редизайн сайта",
    "projectColor": "#8b5cf6",
    "description": "Верстка главной страницы",
    "startTime": "...",
    "endTime": "...",
    "durationSeconds": 9000,
    "createdAt": "..."
  }
}
```

---

### Отчёты

| Метод | Маршрут | Описание | Роль |
|---|---|---|---|
| GET | `/api/reports/dashboard` | Сводка Dashboard | all |
| GET | `/api/reports/weekly` | Недельный отчёт | all |
| GET | `/api/reports/team` | Командная сводка | admin, manager |
| GET | `/api/reports/team/activity` | Лента активности | admin, manager |

#### GET /api/reports/dashboard
```json
// Response 200
{
  "todaySeconds": 14400,
  "weekSeconds": 86400,
  "recentEntries": [ ...5 последних записей ],
  "projects": [ ...все проекты ]
}
```

#### GET /api/reports/team
```json
// Response 200
{
  "users": [
    {
      "id": "uuid",
      "name": "Иван Петров",
      "role": "employee",
      "avatarColor": "#00d4ff",
      "totalSeconds": 36000,
      "totalHours": 10.0,
      "entryCount": 12,
      "projectCount": 3
    }
  ],
  "summary": {
    "totalUsers": 5,
    "totalSeconds": 180000,
    "totalHours": 50.0,
    "totalEntries": 60
  }
}
```

---

## Коды ответов

| Код | Описание |
|---|---|
| 200 | OK — запрос выполнен |
| 201 | Created — ресурс создан |
| 400 | Bad Request — ошибка валидации тела запроса |
| 401 | Unauthorized — токен отсутствует, истёк или неверен |
| 403 | Forbidden — недостаточно прав |
| 404 | Not Found — ресурс не найден |
| 409 | Conflict — например, email уже занят |
| 429 | Too Many Requests — превышен rate limit |
| 500 | Internal Server Error — непредвиденная ошибка |

Формат ошибки:
```json
{ "status": 400, "error": "Описание ошибки" }
```

---

## Аутентификация в запросах

Все защищённые маршруты требуют заголовок:
```
Authorization: Bearer <accessToken>
```

Жизненный цикл токенов:
```
1. login → accessToken (15 мин) + refreshToken (30 дней)
2. Запрос с accessToken → если 401 TokenExpired → вызвать /auth/refresh
3. /auth/refresh → новый accessToken + новый refreshToken (ротация)
4. logout → refreshToken отзывается на сервере
```

---

## Требования

- Node.js 18+
- PostgreSQL 14+
- npm 8+
