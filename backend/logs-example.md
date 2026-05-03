# Примеры логов — TimeTrack Pro Backend

Логирование реализовано через **Winston**. Два режима — `development` и `production`.

---

## DEVELOPMENT MODE
> Формат: `[TIMESTAMP] LEVEL: Сообщение { мета }`
> Цвет: зелёный = info, жёлтый = warn, красный = error, синий = debug

```
[2026-05-03 09:00:01] info: 🚀 Server started on port 3000 {"env":"development"}

[2026-05-03 09:01:14] info: → POST /api/auth/register 201 83ms {"ip":"192.168.1.12"}
[2026-05-03 09:01:14] debug: New user registered {"userId":"a3f8c1d2","email":"ivan@company.com","role":"employee"}

[2026-05-03 09:01:45] info: → POST /api/auth/login 200 142ms {"ip":"192.168.1.12"}
[2026-05-03 09:01:45] debug: Access token issued {"userId":"a3f8c1d2","expiresIn":"15m"}

[2026-05-03 09:02:10] info: → GET /api/reports/dashboard 200 38ms {"ip":"192.168.1.12","userId":"a3f8c1d2"}
[2026-05-03 09:02:10] debug: Dashboard queries {"todaySeconds":5400,"weekSeconds":89100,"projectsCount":4}

[2026-05-03 09:03:27] info: → POST /api/entries 201 57ms {"ip":"192.168.1.12","userId":"a3f8c1d2"}
[2026-05-03 09:03:27] debug: Time entry created {"entryId":"e9b2a0f1","projectId":"p7c4d3e2","durationSeconds":3720}

[2026-05-03 09:04:01] warn: Rate limit exceeded {"ip":"10.0.0.5","route":"/api/auth/login","limit":5}

[2026-05-03 09:04:15] info: → POST /api/auth/login 401 44ms {"ip":"10.0.0.5"}
[2026-05-03 09:04:15] warn: Failed login attempt {"email":"admin@company.com","ip":"10.0.0.5","reason":"Invalid password"}

[2026-05-03 09:05:00] info: → GET /api/users 403 12ms {"ip":"192.168.1.15","userId":"b1c9e7f3","role":"employee"}
[2026-05-03 09:05:00] warn: Forbidden access attempt {"userId":"b1c9e7f3","role":"employee","requiredRole":"admin","path":"/api/users"}

[2026-05-03 09:06:33] info: → PUT /api/users/b1c9e7f3/role 200 61ms {"ip":"192.168.1.1","userId":"d0e1f2a3"}
[2026-05-03 09:06:33] info: User role updated {"targetUserId":"b1c9e7f3","oldRole":"employee","newRole":"manager","changedBy":"d0e1f2a3"}

[2026-05-03 09:07:11] info: → POST /api/auth/refresh 200 29ms {"ip":"192.168.1.12"}
[2026-05-03 09:07:11] debug: Refresh token rotated {"userId":"a3f8c1d2","oldTokenRevoked":true}

[2026-05-03 09:08:45] error: Database connection lost {"host":"localhost","port":5432,"code":"ECONNREFUSED"}
[2026-05-03 09:08:45] error: Query failed: connect ECONNREFUSED 127.0.0.1:5432
    at Pool.<anonymous> (/backend/src/config/database.js:28:15)
    at Pool.emit (node:events:514:28)
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)

[2026-05-03 09:08:50] info: Database reconnected {"host":"localhost","port":5432}

[2026-05-03 09:09:30] info: → POST /api/auth/refresh 401 8ms {"ip":"192.168.1.99"}
[2026-05-03 09:09:30] warn: 🚨 Replay attack detected — all sessions revoked {"userId":"f4a2c8b1","ip":"192.168.1.99"}

[2026-05-03 09:10:00] info: → DELETE /api/projects/p7c4d3e2 204 73ms {"ip":"192.168.1.12","userId":"a3f8c1d2"}
[2026-05-03 09:10:00] debug: Project deleted with cascade {"projectId":"p7c4d3e2","entriesDeleted":17}

[2026-05-03 09:11:00] info: → POST /api/auth/logout 200 11ms {"ip":"192.168.1.12","userId":"a3f8c1d2"}
[2026-05-03 09:11:00] debug: Refresh token revoked {"userId":"a3f8c1d2"}

[2026-05-03 17:59:58] info: SIGTERM received — starting graceful shutdown
[2026-05-03 17:59:58] info: HTTP server closed
[2026-05-03 17:59:59] info: PostgreSQL pool closed
[2026-05-03 17:59:59] info: 👋 Process exited cleanly
```

---

## PRODUCTION MODE
> Формат: **структурированный JSON** — каждая строка = один лог-объект
> Читается машиной: ELK Stack (Kibana), Datadog, Grafana Loki

```json
{"level":"info","message":"🚀 Server started on port 3000","env":"production","timestamp":"2026-05-03T06:00:01.000Z"}
{"level":"info","message":"→ POST /api/auth/register 201 83ms","ip":"192.168.1.12","timestamp":"2026-05-03T06:01:14.123Z"}
{"level":"debug","message":"New user registered","userId":"a3f8c1d2","email":"ivan@company.com","role":"employee","timestamp":"2026-05-03T06:01:14.198Z"}
{"level":"info","message":"→ POST /api/auth/login 200 142ms","ip":"192.168.1.12","timestamp":"2026-05-03T06:01:45.301Z"}
{"level":"info","message":"→ GET /api/reports/dashboard 200 38ms","ip":"192.168.1.12","userId":"a3f8c1d2","timestamp":"2026-05-03T06:02:10.444Z"}
{"level":"info","message":"→ POST /api/entries 201 57ms","ip":"192.168.1.12","userId":"a3f8c1d2","timestamp":"2026-05-03T06:03:27.552Z"}
{"level":"warn","message":"Rate limit exceeded","ip":"10.0.0.5","route":"/api/auth/login","limit":5,"timestamp":"2026-05-03T06:04:01.000Z"}
{"level":"warn","message":"Failed login attempt","email":"admin@company.com","ip":"10.0.0.5","reason":"Invalid password","timestamp":"2026-05-03T06:04:15.881Z"}
{"level":"warn","message":"Forbidden access attempt","userId":"b1c9e7f3","role":"employee","requiredRole":"admin","path":"/api/users","timestamp":"2026-05-03T06:05:00.211Z"}
{"level":"info","message":"User role updated","targetUserId":"b1c9e7f3","oldRole":"employee","newRole":"manager","changedBy":"d0e1f2a3","timestamp":"2026-05-03T06:06:33.009Z"}
{"level":"warn","message":"🚨 Replay attack detected — all sessions revoked","userId":"f4a2c8b1","ip":"192.168.1.99","timestamp":"2026-05-03T06:09:30.777Z"}
{"level":"error","message":"Database connection lost","host":"localhost","port":5432,"code":"ECONNREFUSED","timestamp":"2026-05-03T06:08:45.000Z"}
{"level":"error","message":"Unhandled rejection","error":"Cannot read properties of null","stack":"TypeError: Cannot read properties of null (reading 'id')\n    at entryController.js:58:22","timestamp":"2026-05-03T06:12:01.000Z"}
{"level":"info","message":"SIGTERM received — starting graceful shutdown","timestamp":"2026-05-03T17:59:58.000Z"}
{"level":"info","message":"PostgreSQL pool closed","timestamp":"2026-05-03T17:59:59.000Z"}
{"level":"info","message":"👋 Process exited cleanly","timestamp":"2026-05-03T17:59:59.500Z"}
```

---

## Уровни логирования (Winston severity)

| Уровень | Когда используется | Пример |
|---|---|---|
| **error** | Критические ошибки, краши, потеря соединения с БД | `DB connection lost`, `Unhandled rejection` |
| **warn** | Подозрительные события, превышение лимитов, отказ доступа | `Replay attack`, `Rate limit exceeded`, `Forbidden` |
| **info** | Нормальный ход работы: запросы, старт/стоп сервера | `→ POST /api/auth/login 200` |
| **debug** | Детали операций для отладки (в dev-режиме) | `Token rotated`, `Query result: ...` |

---

## Что видит Kibana (ELK) по этим логам

```
Дашборд "API Health":
  ┌──────────────────────────────────────────────┐
  │  Запросов за 24ч: 4 823                       │
  │  Ошибок (error):  3      ▼ -67% от вчера     │
  │  Предупреждений:  12                          │
  │  P95 latency:     87ms                        │
  │                                               │
  │  ТОП эндпоинтов:                             │
  │  POST /api/entries         1 204 req          │
  │  GET  /api/reports/dashboard  987 req         │
  │  POST /api/auth/refresh      412 req          │
  │                                               │
  │  🚨 Alert: Replay attack detected @ 09:09    │
  │     userId: f4a2c8b1  ip: 192.168.1.99       │
  └──────────────────────────────────────────────┘
```
