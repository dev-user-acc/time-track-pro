# TimeTrack Pro — Полное техническое описание для презентации

---

## 0. АРХИТЕКТУРА СИСТЕМЫ — КАК ВЗАИМОДЕЙСТВУЮТ ФРОНТЕНД, БЭКЕНД И БАЗА ДАННЫХ

### Общая трёхуровневая схема

```
╔══════════════════════════════════════════════════════════════════════╗
║  УРОВЕНЬ 1 — КЛИЕНТ (React Native Mobile App)                        ║
║                                                                      ║
║   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             ║
║   │EmployeeNav   │  │ManagerNav    │  │AdminNav      │             ║
║   │• Dashboard   │  │• Dashboard   │  │• Dashboard   │             ║
║   │• Tracking    │  │• Tracking    │  │• Projects    │             ║
║   │• Projects    │  │• Projects    │  │• Users       │             ║
║   │• Reports     │  │• Team        │  │• Reports     │             ║
║   │• Profile     │  │• Profile     │  │• Profile     │             ║
║   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             ║
║          └─────────────────┴─────────────────┘                      ║
║                             │                                        ║
║   Zustand (auth, timer)     │   React Query (кэш БД-запросов)       ║
║   expo-secure-store (JWT)   │   axios (HTTP client + interceptors)  ║
╚════════════════════════════╪═════════════════════════════════════════╝
                             │  HTTPS · JWT Bearer Token
                             ↕
╔════════════════════════════╪═════════════════════════════════════════╗
║  УРОВЕНЬ 2 — БЭКЕНД (Node.js + Express REST API)                    ║
║                                                                      ║
║  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐   ║
║  │ Middleware  │  │  Controllers │  │  Routes                  │   ║
║  │• helmet     │  │• auth        │  │ POST /api/auth/register  │   ║
║  │• cors       │  │• users       │  │ POST /api/auth/login     │   ║
║  │• rateLimit  │  │• projects    │  │ POST /api/auth/refresh   │   ║
║  │• JWT verify │  │• entries     │  │ POST /api/auth/logout    │   ║
║  │• rbac check │  │• reports     │  │ GET  /api/users/*        │   ║
║  │• zod valid. │  └──────────────┘  │ CRUD /api/projects/*    │   ║
║  └─────────────┘                    │ CRUD /api/entries/*     │   ║
║                                     │ GET  /api/reports/*     │   ║
║                                     └──────────────────────────┘   ║
╚════════════════════════════╪═════════════════════════════════════════╝
                             │  pg.Pool · Parameterized SQL
                             ↕
╔════════════════════════════╪═════════════════════════════════════════╗
║  УРОВЕНЬ 3 — БАЗА ДАННЫХ (PostgreSQL 16)                             ║
║                                                                      ║
║  ┌──────────────┐  ┌──────────────────┐  ┌────────────────────┐    ║
║  │    users     │  │    projects      │  │   time_entries     │    ║
║  │──────────────│  │──────────────────│  │────────────────────│    ║
║  │ id UUID PK   │  │ id UUID PK       │  │ id UUID PK         │    ║
║  │ email UNIQUE │  │ name TEXT        │  │ user_id → users    │    ║
║  │ password_hash│  │ description TEXT │  │ project_id→projects│    ║
║  │ name TEXT    │  │ color TEXT       │  │ start_time TSTZ    │    ║
║  │ role ENUM    │◄─┤ owner_id→users   │  │ end_time TSTZ      │    ║
║  │ avatar_color │  │ status ENUM      │  │ duration_seconds   │    ║
║  │ created_at   │  │ total_seconds    │◄─┤ description TEXT   │    ║
║  └──────────────┘  │ updated_at       │  │ created_at TSTZ    │    ║
║                    └──────────────────┘  └────────────────────┘    ║
║                                                                      ║
║  refresh_tokens: id, user_id→users, token_hash, expires_at, revoked ║
║  Индексы: idx_entries_user_id, idx_entries_start_time,              ║
║           idx_entries_project_id, idx_projects_owner_id             ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

### Маршруты запросов по ролям

| Роль | Endpoint | Middleware-цепочка |
|---|---|---|
| Любая | `POST /api/auth/login` | `authLimiter` → `validate(loginSchema)` → controller |
| Любая | `POST /api/auth/refresh` | `validate(refreshSchema)` → controller |
| Все авториз. | `GET /api/entries` | `authenticate` → controller |
| Все авториз. | `POST /api/entries` | `authenticate` → `validate(createEntry)` → controller |
| manager + admin | `POST /api/projects` | `authenticate` → `requireRole('manager','admin')` → `validate` → controller |
| manager + admin | `GET /api/entries/all` | `authenticate` → `requireRole('manager','admin')` → controller |
| admin only | `GET /api/users` | `authenticate` → `requireRole('admin')` → controller |
| admin only | `PUT /api/users/:id/role` | `authenticate` → `requireRole('admin')` → `validate(updateRole)` → controller |
| admin only | `GET /api/reports/team` | `authenticate` → `requireRole('admin','manager')` → controller |

---

## 1. ДЕТАЛЬНЫЕ ПОТОКИ ДАННЫХ (DATA FLOW)

### 1.1 Регистрация пользователя

```
КЛИЕНТ                              БЭКЕНД                        БД (PostgreSQL)
  │                                    │                               │
  │── POST /api/auth/register ────────►│                               │
  │   {email, password, name, role}    │                               │
  │                                    │ 1. authLimiter (5 req/15min)  │
  │                                    │ 2. validate(registerSchema)   │
  │                                    │    • email format             │
  │                                    │    • password ≥8, uppercase,  │
  │                                    │      digit                    │
  │                                    │    • role in enum             │
  │                                    │                               │
  │                                    │── SELECT id FROM users ──────►│
  │                                    │   WHERE email = $1            │
  │                                    │◄─────────────────── rows[] ───│
  │                                    │                               │
  │                                    │ (если rows.length > 0)        │
  │◄── 409 Conflict ───────────────────│ return ConflictError          │
  │    "Email уже занят"               │                               │
  │                                    │                               │
  │                                    │ bcrypt.hash(password, 12)     │
  │                                    │── INSERT INTO users ─────────►│
  │                                    │   VALUES($1,$2,$3,$4,$5,$6)  │
  │                                    │◄─────────────── user row ─────│
  │                                    │                               │
  │                                    │ generateAccessToken(user)     │
  │                                    │ generateRefreshToken(user)    │
  │                                    │── INSERT refresh_tokens ─────►│
  │                                    │   token_hash=SHA256(rt)       │
  │                                    │   expires_at = NOW()+30d      │
  │◄── 201 Created ────────────────────│                               │
  │    {accessToken, refreshToken,     │                               │
  │     user: {id,name,role,...}}      │                               │
  │                                    │                               │
  │ Zustand: setUser(user)             │                               │
  │ SecureStore: save(refreshToken)    │                               │
  │ → Redirect to MainNavigator(role)  │                               │
```

---

### 1.2 Вход в систему + Refresh Token Lifecycle

```
КЛИЕНТ                              БЭКЕНД                        БД (PostgreSQL)
  │                                    │                               │
  │── POST /api/auth/login ───────────►│                               │
  │   {email, password}                │                               │
  │                                    │── SELECT * FROM users ───────►│
  │                                    │   WHERE email = $1            │
  │                                    │◄──────────────── user ────────│
  │                                    │                               │
  │                                    │ (user не найден?)             │
  │                                    │ bcrypt.compare(pw,DUMMY_HASH) │
  │                                    │ → constant-time, no leak      │
  │                                    │ → return 401                  │
  │                                    │                               │
  │                                    │ bcrypt.compare(pw, hash) ✓    │
  │                                    │── DELETE expired refresh ─────►│
  │                                    │   tokens WHERE expires_at<NOW │
  │                                    │── INSERT new refresh_token ──►│
  │                                    │   token_hash = SHA256(rt)     │
  │◄── 200 OK ─────────────────────────│                               │
  │    {accessToken(15min),            │                               │
  │     refreshToken(30d), user}       │                               │
  │                                    │                               │
  │             ... 15 минут ...       │                               │
  │                                    │                               │
  │── POST /api/auth/refresh ─────────►│                               │
  │   {refreshToken: "abc..."}         │                               │
  │                                    │ verifyRefreshToken(rt)        │
  │                                    │── SELECT * FROM               │
  │                                    │   refresh_tokens              │
  │                                    │   WHERE token_hash=SHA256(rt) │
  │                                    │   AND revoked=false           │
  │                                    │◄──────────────── row ─────────│
  │                                    │                               │
  │                                    │ (row не найден = replay!)     │
  │                                    │── UPDATE refresh_tokens ─────►│
  │                                    │   SET revoked=true            │
  │                                    │   WHERE user_id=$1            │
  │◄── 401 Unauthorized ───────────────│ (все сессии пользователя      │
  │    "Replay attack detected"        │  отозваны)                    │
  │                                    │                               │
  │                                    │ (row найден, valid)           │
  │                                    │ Refresh Token Rotation:       │
  │                                    │── UPDATE SET revoked=true ───►│
  │                                    │── INSERT new token ──────────►│
  │◄── 200 OK ─────────────────────────│                               │
  │    {accessToken(new 15min),        │                               │
  │     refreshToken(new 30d)}         │                               │
```

---

### 1.3 Запуск и остановка таймера

```
КЛИЕНТ                              БЭКЕНД                        БД (PostgreSQL)
─────────────────────────────────────────────────────────────────────────────────

── GET /api/projects?status=active ►│ authenticate JWT              │
                                    │── SELECT * FROM projects ────►│
                                    │   WHERE owner_id=$1           │
                                    │   AND status='active'         │
◄── 200 {projects[]}  ──────────────│◄──────────── rows ────────────│
[ProjectPicker показывает список]   │                               │

[Пользователь выбирает проект,      │                               │
 нажимает СТАРТ]                    │                               │
                                    │                               │
Zustand.startTimer({                │                               │
  projectId, startTime: Date.now()  │                               │
})                                  │                               │
setInterval → каждую секунду        │                               │
updateElapsed() → только в памяти   │                               │
[0 запросов к серверу во время      │                               │
 работы таймера]                    │                               │

[Пользователь нажимает СТОП]        │                               │

── POST /api/entries ──────────────►│                               │
   {projectId, startTime,           │ authenticate JWT              │
    endTime, durationSeconds,       │ validate(createEntrySchema)   │
    description}                    │                               │
                                    │── BEGIN TRANSACTION ─────────►│
                                    │── SELECT id FROM projects ───►│
                                    │   WHERE id=$1 AND owner_id=$2 │
                                    │   (проверка владельца)        │
                                    │── INSERT INTO time_entries ──►│
                                    │── UPDATE projects SET ────────►│
                                    │   total_seconds=(SELECT SUM   │
                                    │   FROM time_entries           │
                                    │   WHERE project_id=$1)        │
                                    │── COMMIT ────────────────────►│
                                    │◄──────────── entry row ───────│
◄── 201 Created {entry} ────────────│                               │

Zustand.stopTimer()                 │                               │
queryClient.invalidateQueries(      │                               │
  ['entries', userId])              │                               │
queryClient.invalidateQueries(      │                               │
  ['dashboard'])                    │                               │
[React Query: перезапрашивает       │                               │
 данные → UI обновился]             │                               │
```

---

### 1.4 Отчёты — Dashboard (параллельные запросы)

```
КЛИЕНТ                              БЭКЕНД                        БД (PostgreSQL)
  │                                    │                               │
  │── GET /api/reports/dashboard ─────►│                               │
  │   Authorization: Bearer <jwt>      │                               │
  │                                    │ 1. authenticate(JWT)          │
  │                                    │ 2. extract userId from payload│
  │                                    │                               │
  │                                    │── Promise.all([...]) ─────────│
  │                                    │   ↓ query 1  ↓ query 2        │
  │                                    │   SELECT SUM  SELECT SUM      │
  │                                    │   durations   durations       │
  │                                    │   WHERE       WHERE           │
  │                                    │   start>=TODAY start>=MONDAY  │
  │                                    │                               │
  │                                    │   ↓ query 3  ↓ query 4        │
  │                                    │   SELECT *    SELECT *        │
  │                                    │   FROM        FROM            │
  │                                    │   time_entries projects       │
  │                                    │   WHERE user  WHERE owner_id  │
  │                                    │   ORDER BY    =$1             │
  │                                    │   start DESC                  │
  │                                    │   LIMIT 5                     │
  │                                    │◄─── 4 results in parallel ────│
  │◄── 200 OK ─────────────────────────│                               │
  │    {todaySeconds: 7200,            │                               │
  │     weekSeconds: 134400,          │                               │
  │     recentEntries: [...],          │                               │
  │     projects: [...]}              │                               │
  │                                    │                               │
  │ AnimatedStatCard × 4 rendered      │                               │
  │ withDelay(i*100, withSpring(...))  │                               │
```

---

### 1.5 Командная аналитика (Manager/Admin)

```
КЛИЕНТ                              БЭКЕНД                        БД (PostgreSQL)
  │                                    │                               │
  │── GET /api/reports/team ──────────►│                               │
  │                                    │ authenticate JWT              │
  │                                    │ requireRole('manager','admin')│
  │                                    │ (employee → 403 Forbidden)    │
  │                                    │                               │
  │                                    │── SELECT                    ──►│
  │                                    │   u.id, u.name, u.role,       │
  │                                    │   u.avatar_color,             │
  │                                    │   COALESCE(SUM(te.duration)   │
  │                                    │            ,0) AS total_sec,  │
  │                                    │   COUNT(te.id) AS entry_count │
  │                                    │   FROM users u                │
  │                                    │   LEFT JOIN time_entries te   │
  │                                    │   ON te.user_id = u.id        │
  │                                    │   GROUP BY u.id               │
  │                                    │   ORDER BY total_sec DESC     │
  │                                    │◄──────────── rows[] ──────────│
  │◄── 200 OK ─────────────────────────│                               │
  │    {teamStats: [{userId, name,     │                               │
  │      role, totalSeconds,           │                               │
  │      entryCount, avatarColor},...] │                               │
  │     summary: {totalUsers,          │                               │
  │      totalSeconds, totalEntries}}  │                               │
  │                                    │                               │
  │                                    │                               │
  │── GET /api/reports/team/activity ─►│                               │
  │   ?limit=30                        │ authenticate                  │
  │                                    │ requireRole('manager','admin')│
  │                                    │── SELECT                    ──►│
  │                                    │   te.*, u.name AS userName,   │
  │                                    │   u.role AS userRole,         │
  │                                    │   u.avatar_color              │
  │                                    │   FROM time_entries te        │
  │                                    │   JOIN users u ON             │
  │                                    │     u.id = te.user_id         │
  │                                    │   ORDER BY te.start_time DESC │
  │                                    │   LIMIT $1                    │
  │                                    │◄──────────── rows[] ──────────│
  │◄── 200 OK {activities: [...]} ─────│                               │
  │                                    │                               │
  │ ManagerTeamScreen:                 │                               │
  │  • 3 сводные карточки              │                               │
  │  • FlatList участников             │                               │
  │  • Лента активности (последние 30) │                               │
```

---

### 1.6 Смена роли пользователя (Admin)

```
КЛИЕНТ                              БЭКЕНД                        БД (PostgreSQL)
  │                                    │                               │
  │ AdminUsersScreen: открыт список    │                               │
  │ Нажата карточка пользователя →     │                               │
  │ RolePickerModal открыт             │                               │
  │ Admin выбирает новую роль          │                               │
  │                                    │                               │
  │── PUT /api/users/:id/role ────────►│                               │
  │   Authorization: Bearer <jwt>      │ 1. authenticate(JWT)          │
  │   {role: "manager"}                │ 2. requireRole('admin')       │
  │                                    │ 3. validate(updateRoleSchema) │
  │                                    │                               │
  │                                    │ if (req.params.id ===         │
  │                                    │     req.user.id)              │
  │◄── 400 Bad Request ────────────────│ return "Нельзя менять         │
  │    "Нельзя менять свою роль"       │  собственную роль"            │
  │                                    │                               │
  │                                    │── UPDATE users ──────────────►│
  │                                    │   SET role = $1               │
  │                                    │   WHERE id = $2               │
  │                                    │   RETURNING *                 │
  │                                    │◄────────── updated user ──────│
  │◄── 200 OK {user: {...}} ───────────│                               │
  │                                    │                               │
  │ queryClient.invalidateQueries      │                               │
  │   (['users'])                      │                               │
  │ Toast: "Роль успешно изменена"     │                               │
  │ Список обновился                   │                               │
```

---

### 1.7 Удаление проекта с каскадным удалением записей

```
КЛИЕНТ                              БЭКЕНД                        БД (PostgreSQL)
  │                                    │                               │
  │ LongPress на проект → Alert        │                               │
  │ "Удалить проект? Все записи        │                               │
  │  времени будут удалены"            │                               │
  │ [Подтвердить]                      │                               │
  │                                    │                               │
  │── DELETE /api/projects/:id ───────►│                               │
  │   Authorization: Bearer <jwt>      │ authenticate                  │
  │                                    │ requireRole('manager','admin')│
  │                                    │── DELETE FROM projects ──────►│
  │                                    │   WHERE id=$1                 │
  │                                    │   AND owner_id=$2             │
  │                                    │                               │
  │                                    │   PostgreSQL ON DELETE CASCADE│
  │                                    │   → автоматически удаляет все │
  │                                    │     time_entries WHERE        │
  │                                    │     project_id = удалённый_id │
  │                                    │◄──────────── ok ──────────────│
  │◄── 204 No Content ─────────────────│                               │
  │                                    │                               │
  │ queryClient.invalidateQueries      │                               │
  │   (['projects'])                   │                               │
  │ queryClient.invalidateQueries      │                               │
  │   (['entries'])                    │                               │
```

---

### 1.8 Структура JWT и проверка на каждом запросе

```
ACCESS TOKEN (живёт 15 минут):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@company.com",
  "role": "manager",
  "name": "Иван Петров",
  "iat": 1746000000,
  "exp": 1746000900    ← через 15 минут
}

Middleware `authenticate` на каждом защищённом роуте:
 1. Читает заголовок: Authorization: Bearer eyJ...
 2. jwt.verify(token, JWT_ACCESS_SECRET)
 3. Если истёк → TokenExpiredError → 401 "Token expired"
 4. Если подпись неверна → 401 "Invalid token"
 5. req.user = { id, email, role, name }
 6. next() → следующий middleware или controller

Middleware `requireRole('admin', 'manager')`:
 1. Читает req.user.role
 2. Если role не в списке → 403 "Forbidden"
 3. next()
```

---

### 1.9 Полная карта эндпоинтов → SQL-запросов

| Endpoint | SQL-операции | Таблицы |
|---|---|---|
| `POST /auth/register` | SELECT (email unique check) + INSERT + INSERT | users, refresh_tokens |
| `POST /auth/login` | SELECT + UPDATE (cleanup) + INSERT | users, refresh_tokens |
| `POST /auth/refresh` | SELECT + UPDATE (revoke) + INSERT | refresh_tokens |
| `POST /auth/logout` | UPDATE SET revoked=true | refresh_tokens |
| `GET /users/me` | SELECT WHERE id | users |
| `GET /users` | SELECT all ORDER BY created_at | users |
| `PUT /users/:id/role` | UPDATE SET role WHERE id | users |
| `GET /users/:id/stats` | SELECT SUM + SELECT COUNT DISTINCT | time_entries |
| `GET /projects` | SELECT WHERE owner_id + optional status | projects |
| `POST /projects` | INSERT | projects |
| `PUT /projects/:id` | Dynamic UPDATE WHERE id AND owner_id | projects |
| `DELETE /projects/:id` | DELETE WHERE id AND owner_id → CASCADE | projects, time_entries |
| `GET /entries` | SELECT WHERE user_id LIMIT 100 | time_entries |
| `GET /entries/today` | SELECT SUM WHERE start>=midnight | time_entries |
| `GET /entries/week` | SELECT SUM WHERE start>=monday | time_entries |
| `GET /entries/range` | SELECT WHERE start BETWEEN from AND to | time_entries |
| `GET /entries/all` | SELECT JOIN users WHERE all users | time_entries, users |
| `POST /entries` | BEGIN + INSERT + UPDATE projects total_seconds + COMMIT | time_entries, projects |
| `DELETE /entries/:id` | BEGIN + DELETE + UPDATE projects total_seconds + COMMIT | time_entries, projects |
| `GET /reports/dashboard` | 4× parallel: SUM today + SUM week + SELECT 5 entries + SELECT projects | time_entries, projects |
| `GET /reports/weekly` | SELECT entries last 7 days → group by day + by project | time_entries |
| `GET /reports/team` | LEFT JOIN users+time_entries GROUP BY user | users, time_entries |
| `GET /reports/team/activity` | JOIN entries+users ORDER BY start DESC LIMIT N | time_entries, users |

---

### 1.10 Защита данных на каждом уровне

```
УРОВЕНЬ КЛИЕНТА:
  ├── accessToken храним в Zustand (оперативная память — не Asyncstorage)
  ├── refreshToken в expo-secure-store (Android Keystore / iOS Keychain)
  ├── RBAC на уровне навигаторов: 3 отдельных Tab Navigator по роли
  └── Role guard на кнопках: {role !== 'employee' && <FAB />}

УРОВЕНЬ БЭКЕНДА:
  ├── Helmet: Content-Security-Policy, X-Frame-Options, HSTS, noSniff
  ├── CORS: только разрешённые origins
  ├── Rate Limiting: 100 req/15min general, 5 req/15min для auth
  ├── Zod validation: входящие данные проверяются до контроллера
  ├── JWT Middleware: verify подпись + срок жизни на каждом запросе
  ├── RBAC Middleware: роль из JWT токена (не из тела запроса)
  ├── bcrypt(cost=12): защита от brute-force + уникальная соль
  └── Refresh Token Rotation: replay attack → revoke all user sessions

УРОВЕНЬ БД:
  ├── Параметризованные запросы ($1, $2): 100% защита от SQL-injection
  ├── SHA256 хэш refresh-токена в БД (не raw token)
  ├── Foreign Keys с CASCADE: ссылочная целостность
  ├── ENUM типы: user_role, project_status — невалидные значения отклонены
  ├── UNIQUE на email: на уровне индекса БД
  └── SSL-соединение с БД в production
```

---

## 1. ТЕХНИЧЕСКОЕ ОПИСАНИЕ ПРИЛОЖЕНИЯ

### Общая концепция

**TimeTrack Pro** — корпоративное мобильное приложение для учёта рабочего времени, управления проектами и контроля командной продуктивности. Приложение построено на принципе **централизованного хранения данных**: все записи сотрудников, проекты и статистика хранятся на едином сервере и доступны в актуальном виде для менеджеров и администраторов в режиме реального времени.

Архитектура — **клиент-сервер**: мобильное приложение отправляет данные на backend через защищённый REST API, сервер сохраняет их в общую базу данных. Менеджер, открыв вкладку «Команда», видит реальные данные всех сотрудников прямо сейчас — не устаревший локальный снимок, а живую синхронизированную картину. Администратор управляет ролями пользователей с мгновенным эффектом на всех устройствах.

Для сотрудника интерфейс работает максимально плавно за счёт **offline-first подхода**: таймер и список задач работают даже без сети, а при восстановлении подключения данные автоматически синхронизируются с сервером.

Философия приложения — **«запустил таймер и забыл»**: пользователь одним нажатием начинает отсчёт времени по проекту, система сама считает, агрегирует, синхронизирует и формирует отчёты — доступные руководству в любой момент.

---

### Роли пользователей

В системе реализованы **три роли**, каждая с уникальным набором возможностей и собственным интерфейсом навигации.

#### 👤 Сотрудник (employee)
Базовая роль — рядовой участник команды.

| Вкладка | Что доступно |
|---|---|
| **Главная** | Сводка за день/неделю, последние записи, быстрый старт таймера |
| **Трекер** | Запуск/остановка таймера, выбор проекта, ввод описания, история записей с удалением |
| **Проекты** | Просмотр своих проектов (режим «только чтение», FAB и удаление скрыты) |
| **Отчёты** | Личная статистика: столбчатый график за 7 дней, разбивка по проектам |
| **Профиль** | Просмотр данных аккаунта, выход из системы |

Ограничения: **не может** создавать/удалять проекты, изменять их статус, видеть данные других пользователей.

---

#### 🏆 Менеджер (manager)
Расширенная роль — руководитель команды.

| Вкладка | Что доступно |
|---|---|
| **Главная** | Всё то же, что у сотрудника + баннер с ролью |
| **Трекер** | Полный трекинг времени |
| **Проекты** | Создание, редактирование, смена статуса (`active` / `paused` / `completed` / `archived`), удаление проектов |
| **Команда** | Просмотр всех пользователей системы, суммарные часы и количество записей каждого, лента последней активности (30 записей от всех), агрегированная статистика по команде |
| **Профиль** | Данные аккаунта, выход |

---

#### 👑 Администратор (admin)
Максимальный уровень доступа — владелец системы.

| Вкладка | Что доступно |
|---|---|
| **Главная** | Сводка + статус-баннер администратора |
| **Проекты** | Полный CRUD над проектами |
| **Сотрудники** | Список всех зарегистрированных пользователей, просмотр суммарных часов/проектов каждого, **изменение роли** любого пользователя через модальное окно (нельзя сменить свою собственную роль) |
| **Отчёты** | Личные и командные отчёты |
| **Профиль** | Данные аккаунта, выход |

---

### Ключевые функциональные модули

#### Модуль трекинга времени
- **Старт таймера**: пользователь выбирает проект из списка активных, опционально вводит описание задачи, нажимает «Старт»
- **Работающий таймер**: счётчик обновляется каждую секунду в реальном времени, виджет таймера закреплён на экране (виден даже при скролле)
- **Остановка**: запись автоматически фиксируется с точными `startTime` и `endTime`, вычисляется `durationSeconds`
- **История**: список всех записей с цветовой меткой проекта, временем и длительностью, свайп/кнопка удаления с подтверждением через `Alert`

#### Модуль проектов
- Создание проекта: название, описание, цвет (8 неоновых оттенков)
- Статусы проекта: `active` → `paused` → `completed` → `archived`
- На экране детали проекта: все временные записи по данному проекту, суммарное время, возможность удаления записей (для менеджера/администратора)
- Каскадное удаление: при удалении проекта удаляются все его временные записи

#### Модуль отчётов
- **Столбчатый график** (BarChart): последние 7 дней, высота столбца пропорциональна часам
- **Разбивка по проектам**: доля каждого проекта в общем времени за неделю
- Сводные карточки: всего часов за неделю, среднее в день, количество активных дней

#### Модуль команды (Manager Team)
- Сводные карточки: кол-во сотрудников, суммарные часы команды, общее число записей
- Таблица участников: аватар с цветом, имя, роль (цветная метка), часы, кол-во записей
- Лента активности: последние 30 записей ВСЕХ пользователей — имя сотрудника, проект, дата, длительность

#### Модуль управления пользователями (Admin Users)
- Список всех аккаунтов с аватаром (инициал + цвет), email, часами, количеством проектов
- Цветная плашка роли для быстрой идентификации
- Модальное окно смены роли: три карточки с иконкой, названием и описанием каждой роли
- Защита: кнопка «Изменить» неактивна для собственного аккаунта

#### Модуль аутентификации
- **Регистрация**: имя, email, пароль + визуальный выбор роли (3 карточки с иконками и описанием)
- **Вход**: email + пароль, автоматическое восстановление сессии при перезапуске приложения
- **Выход**: очищает защищённое хранилище и глобальный стейт

---

## 2. ТЕХНОЛОГИИ И АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### Стек технологий

#### Фронтенд (React Native Mobile App)

| Технология | Версия | Назначение |
|---|---|---|
| **React Native** | 0.81.5 | Кроссплатформенный UI движок (Android + iOS) |
| **Expo SDK** | 54.0.33 | Инфраструктура сборки и нативных модулей |
| **TypeScript** | 5.9.2 | Строгая типизация всего кода |
| **React** | 19.1.0 | Компонентный движок |
| **Zustand** | 5.0.12 | Глобальный стейт: авторизация, таймер, проекты |
| **TanStack React Query** | 5.100.8 | HTTP-кэш, polling, инвалидация после мутаций |
| **React Navigation** | 7.x (Stack + Tabs) | Навигация: AuthStack + 3 RoleNavigators |
| **expo-secure-store** | 15.0.8 | Зашифрованное хранение JWT Refresh Token |
| **react-native-reanimated** | 4.1.1 | Нативные анимации (60 FPS) |
| **expo-linear-gradient** | 15.0.8 | Градиентные фоны |
| **expo-blur** | 15.0.8 | BlurView — glass-эффект tab-bar |
| **date-fns** | 4.1.0 | Форматирование и расчёт временных диапазонов |
| **uuid** | 14.0.0 | Генерация UUID v4 на клиенте |
| **@expo/vector-icons** | 15.1.1 | Иконки Ionicons |
| **react-native-svg** | 15.12.1 | SVG-графики в отчётах |
| **EAS Build** | — | Облачная сборка APK / AAB |

#### Бэкенд (Node.js REST API)

| Технология | Версия | Назначение |
|---|---|---|
| **Node.js** | 18+ | Среда выполнения JavaScript на сервере |
| **Express** | 4.19 | HTTP-фреймворк, маршрутизация, middleware |
| **PostgreSQL** | 16 | Реляционная база данных (основное хранилище) |
| **pg (node-postgres)** | 8.13 | PostgreSQL Pool + параметризованные запросы |
| **bcryptjs** | 2.4 | Хэширование паролей (cost=12, уникальная соль) |
| **jsonwebtoken** | 9.0 | Генерация и верификация JWT Access/Refresh токенов |
| **express-rate-limit** | 7.5 | Rate limiting: 100 req/15min общий, 5 req/15min auth |
| **helmet** | 8.0 | Безопасные HTTP-заголовки (CSP, HSTS, X-Frame) |
| **cors** | 2.8 | Управление CORS-политиками |
| **zod** | 3.24 | Схемная валидация входящих данных |
| **winston** | 3.17 | Структурированное логирование (JSON prod / colorized dev) |
| **uuid** | 11.1 | UUID v4 для первичных ключей |

---

### Почему именно эти технологии?

#### React Native + Expo
Выбран как единственный фреймворк, позволяющий **разработать одно приложение под Android и iOS**, используя JavaScript/TypeScript. Expo убирает необходимость в XCode / Android Studio для базовой разработки и предоставляет готовые нативные модули (SQLite, SecureStore, Camera и т.д.). Expo SDK 54 с `newArchEnabled: true` использует **новую архитектуру React Native (JSI + Fabric)** — более быстрый Bridge между JS и нативным слоем.

#### expo-sqlite (WAL-режим)
SQLite выбран потому что:
- Данные хранятся **локально**, не нужен сервер
- **ACID-транзакции** — целостность данных гарантирована
- **WAL (Write-Ahead Logging)** — режим журналирования, при котором read и write не блокируют друг друга; записи быстрее на 30-50%
- `PRAGMA foreign_keys = ON` — каскадная целостность (удаляешь проект → удаляются все его записи)
- **Индексы** на `user_id`, `project_id`, `start_time` — ускоряют фильтрацию по пользователю и диапазону дат

#### Zustand
Лёгкий менеджер состояния (~1 КБ). В приложении используется для:
- `authStore` — текущий пользователь, статус аутентификации
- `trackingStore` — активный таймер, текущее elapsed время
- `projectStore` — список проектов в памяти

Zustand с **стабильными селекторами** (`(s) => s.user`) предотвращает лишние ре-рендеры компонентов — только тот компонент перерисовывается, чьё подписанное значение изменилось.

#### TanStack React Query
Управляет **серверным (БД) стейтом**: кэшируют запросы, автоматически инвалидируют их после мутаций, предоставляют `isLoading` / `isError` / `data`. Параметры `staleTime` настроены под каждый экран:
- Dashboard: `staleTime: 20_000` мс — обновляется не чаще раза в 20 сек
- Tracker entries: `staleTime: 15_000` мс
- Weekly reports: `staleTime: 30_000` мс

Это **снижает нагрузку на SQLite** при частых навигациях между экранами.

#### expo-secure-store (Зашифрованное хранение сессии)
При успешном входе сериализованный объект пользователя сохраняется в **Keychain (iOS) / Keystore (Android)** — аппаратно зашифрованном хранилище. При перезапуске приложения сессия восстанавливается без повторного ввода логина.

#### react-native-reanimated 4 (Worklets)
Анимации выполняются в **отдельном нативном потоке**, а не в JS-потоке — это гарантирует **60 FPS** даже при одновременной работе таймера и скролла списка. Каждая stat-карточка дашборда появляется с `withDelay + withSpring`, создавая эффект каскадного появления.

---

### Архитектура данных

#### Схема базы данных

```sql
-- Пользователи
users (
  id           TEXT PRIMARY KEY,   -- UUID v4
  email        TEXT UNIQUE,         -- нижний регистр
  password_hash TEXT,               -- хэш с солью
  name         TEXT,
  role         TEXT DEFAULT 'employee',
  avatar_color TEXT,                -- один из 8 проектных цветов
  created_at   TEXT                 -- ISO 8601
)

-- Проекты
projects (
  id             TEXT PRIMARY KEY,
  name           TEXT,
  description    TEXT,
  color          TEXT,
  status         TEXT DEFAULT 'active',  -- active/paused/completed/archived
  owner_id       TEXT → users(id),
  total_seconds  INTEGER DEFAULT 0,
  created_at     TEXT,
  updated_at     TEXT
)

-- Временные записи
time_entries (
  id               TEXT PRIMARY KEY,
  user_id          TEXT → users(id),
  project_id       TEXT → projects(id),
  project_name     TEXT,    -- денормализация для скорости
  project_color    TEXT,    -- денормализация для скорости
  description      TEXT,
  start_time       TEXT,    -- ISO 8601
  end_time         TEXT,    -- NULL если таймер ещё идёт
  duration_seconds INTEGER DEFAULT 0,
  created_at       TEXT
)

-- Индексы производительности
CREATE INDEX idx_entries_user    ON time_entries(user_id);
CREATE INDEX idx_entries_project ON time_entries(project_id);
CREATE INDEX idx_entries_start   ON time_entries(start_time);
CREATE INDEX idx_projects_owner  ON projects(owner_id);
```

#### Денормализация полей проекта в записях
`project_name` и `project_color` хранятся прямо в `time_entries`. Это позволяет рендерить историю записей **одним запросом без JOIN**, что критично для производительности на мобильном устройстве.

---

### Обработка данных, безопасность и надёжность

#### Хеширование паролей
Пароль **никогда не хранится в открытом виде**. При регистрации и входе применяется хэш-функция с солью:
```typescript
simpleHash(password + 'tt_salt')
// Алгоритм: djb2 (Bernstein hash) — побитовые операции, детерминированный
```
В базе хранится только хэш, сравнение идёт хэш-к-хэшу.

#### Уникальность email
При регистрации выполняется проверка `SELECT id FROM users WHERE email = ?` перед вставкой. Если email уже существует — выбрасывается ошибка `'Пользователь с таким email уже зарегистрирован'`.

#### Защита сессии
Сессионные данные хранятся в `expo-secure-store` — зашифрованном системном хранилище. На Android используется **Android Keystore** (TEE/hardware-backed), на iOS — **Keychain Services**. Данные не могут быть прочитаны другими приложениями.

#### Защита от SQL-инъекций
Все SQL-запросы используют **параметризованные placeholder'ы** (`?`), переданные через массив значений:
```typescript
db.getFirstAsync('SELECT * FROM users WHERE email = ? AND password_hash = ?', [email, hash])
```
Прямая конкатенация строк в SQL-запросах отсутствует полностью.

#### Защита ролей на уровне UI (Role-Based Access Control)
- EmployeeNavigator, ManagerNavigator, AdminNavigator — три **отдельных навигатора**, рендерятся по роли
- Кнопки создания/удаления проекта рендерятся только при `role === 'manager' || role === 'admin'`
- Смена своей роли заблокирована: `isMe = user.id === currentUserId` → кнопка неактивна

#### Контроль утечек памяти
- `useTimer` использует `useRef` для хранения `setInterval` и очищает его в `useEffect cleanup`:
  ```typescript
  return () => { if (timerRef.current) clearInterval(timerRef.current); };
  ```
- Все компоненты обёрнуты в `React.memo` — исключаются лишние ре-рендеры
- Селекторы Zustand стабилизированы через inline-функции — нет пересоздания подписок

#### Оптимизация производительности
- **FlatList** вместо ScrollView для больших списков — виртуализация (рендерятся только видимые элементы)
- **Адаптивные размеры**: `moderateScale()`, `verticalScale()` — интерфейс масштабируется под любой экран (от маленьких 360px до планшетов 768px+)
- **staleTime** в React Query: повторный запрос к БД не делается, если данные свежие
- Единственный экземпляр SQLite-соединения: `let _db: SQLiteDatabase | null = null` — Singleton паттерн, open один раз

#### Логирование запросов
В девелоперской сборке React Query DevTools отображает все запросы и мутации. В production настроен `staleTime` и `gcTime` (garbage collection) для автоматической очистки неиспользуемых кэш-записей из памяти.

---

## 3. ЭТАПЫ РАЗРАБОТКИ

### Этап 1 — Проектирование и дизайн-концепция

**Цель**: определить визуальный язык и структуру приложения.

- Разработана цветовая палитра в стиле **«тёмный неон»** (dark + glow):
  - Фон `#05050f` / `#08081a` — почти чёрный
  - Акценты: neonBlue `#00d4ff`, neonPurple `#8b5cf6`, neonPink `#f472b6`, neonOrange `#f59e0b`, neonGreen `#10b981`
- Выбрана концепция **глассморфизм** (glass morphism): карточки с `rgba(255,255,255,0.05)` фоном и полупрозрачной рамкой `rgba(255,255,255,0.08)`
- Tab-bar — **BlurView** с `intensity: 40` — эффект матового стекла поверх контента
- Определена типографика: иерархия h1/h2/body/caption/bodySmall

**Артефакты этапа**: цветовые константы `Colors`, типографика `Typography`, компоненты `GlassCard`, `NeonButton`, `Badge`

---

### Этап 2 — User Flow и структура навигации

**Цель**: спроектировать пути пользователя от запуска до выполнения каждой задачи.

```
Запуск приложения
    ↓
Splash / восстановление сессии (SecureStore)
    ↓ нет сессии          ↓ есть сессия
Auth Stack               Main Navigator
  └── LoginScreen              ↓
  └── RegisterScreen     по роли:
        ↓ выбор роли      ├── EmployeeNavigator (5 вкладок)
        └── регистрация   ├── ManagerNavigator  (5 вкладок)
                          └── AdminNavigator    (5 вкладок)
```

**Сценарии сотрудника**:
1. Запустить таймер → выбрать проект → подождать → остановить → запись сохранена
2. Посмотреть историю → удалить ненужную запись → подтвердить
3. Посмотреть отчёт → аналитика за неделю

**Сценарии менеджера**:
1. Создать проект → заполнить форму → выбрать цвет → сохранить
2. Перевести проект в completed → изменить статус в деталях проекта
3. Открыть вкладку «Команда» → посмотреть кто сколько работал

**Сценарии администратора**:
1. Открыть «Сотрудники» → найти пользователя → изменить роль → подтвердить

---

### Этап 3 — Проектирование базы данных

**Цель**: разработать схему, обеспечивающую производительность и целостность данных.

- Выбор SQLite как локальной RDBMS
- Проектирование 3 таблиц: `users`, `projects`, `time_entries`
- Включение `PRAGMA foreign_keys = ON` для ссылочной целостности
- Включение `PRAGMA journal_mode = WAL` для параллельных чтений
- Добавление 4 индексов для ускорения основных запросов
- Решение о **денормализации** `project_name` и `project_color` в `time_entries` (избегаем JOIN в горячем пути)
- Определение UUID v4 как первичных ключей (глобально уникальны, безопасны)

---

### Этап 4 — Backend (сервисный слой)

**Цель**: реализовать всю бизнес-логику доступа к данным.

Разработаны три **Repository-паттерна**:

**userRepository**:
- `register()` — проверка уникальности email, хэширование пароля, вставка
- `login()` — верификация хэша пароля, возврат User-объекта
- `getAll()` — все пользователи для администратора
- `updateRole()` — смена роли пользователя
- `getUserStats()` — агрегирует суммарные секунды и кол-во проектов

**projectRepository**:
- `getAll(userId)` — проекты данного владельца
- `create()`, `update()`, `delete()` — CRUD
- `updateTotalSeconds()` — пересчёт суммарного времени после добавления/удаления записей

**timeEntryRepository**:
- `getByUser()`, `getByProject()`, `getByDateRange()` — фильтрованные выборки
- `create()` — фиксирует новую запись
- `delete()` — удаление с последующей инвалидацией кэша
- `getTodaySeconds()`, `getWeekSeconds()`, `getDailySeconds()` — агрегированная аналитика
- `getAllUsersEntries()` — для менеджера (все пользователи)
- `getTeamStats()` — GROUP BY user_id → статистика каждого

---

### Этап 5 — Государственное управление (State Management)

**Цель**: правильно разделить локальный и серверный стейт.

- **authStore (Zustand)**: пользователь, `isAuthenticated`, методы `logout`/`restoreSession`
- **trackingStore (Zustand)**: `activeTimer` — текущий запущенный таймер и его состояние
- **projectStore (Zustand)**: кэш проектов в памяти для мгновенного доступа из TrackingScreen
- **React Query**: все запросы к SQLite — кэш с `staleTime`, автоматическая инвалидация после мутаций через `queryClient.invalidateQueries()`

Принцип разделения: **«живые данные» (таймер, пользователь) → Zustand**, **«запрошенные данные» (БД) → React Query**

---

### Этап 6 — Frontend (UI/UX реализация)

**Цель**: реализовать все экраны в соответствии с дизайн-системой.

**Разработанные экраны**:

| Экран | Ключевые UI-элементы |
|---|---|
| `LoginScreen` | Поля email/пароль, анимированный NeonButton |
| `RegisterScreen` | Поля + 3 карточки выбора роли с иконками и описаниями |
| `DashboardScreen` | AnimatedStatCard ×4, TimerWidget, последние записи, role-banner |
| `TrackingScreen` | TimerWidget, FAB, модальный ProjectPicker, FlatList записей |
| `ProjectsScreen` | FlatList проектов, LongPress удаление, FAB создания, role-guard |
| `ProjectDetailScreen` | Статистика проекта, статус-кнопка, список записей, удаление |
| `ReportsScreen` | WeeklyBarChart (SVG), ProjectBreakdown (горизонтальные бары), сводка |
| `ManagerTeamScreen` | Сводные карточки, список участников, лента активности |
| `AdminUsersScreen` | Список пользователей, модальный RolePickerModal |
| `ProfileScreen` | Аватар, данные, кнопка выхода |

**Общие UI-компоненты**: `GlassCard`, `NeonButton`, `Input`, `Badge`, `FloatingActionButton`, `SkeletonCard`, `TimerWidget`, `TimeEntryList`

**Адаптивность**:
- Три breakpoint'а: `isSmallDevice` (<360px), стандарт (360–767px), `isTablet` (≥768px)
- `moderateScale()` / `verticalScale()` для масштабируемых отступов и размеров шрифтов

---

### Этап 7 — Ролевая система и разграничение доступа

**Цель**: реализовать полноценный RBAC (Role-Based Access Control).

- Три отдельных навигатора: `EmployeeNavigator`, `ManagerNavigator`, `AdminNavigator` — `MainNavigator` рендерит нужный по `user.role`
- Каждый навигатор имеет уникальный набор вкладок и цветовых акцентов
- Role guard на уровне компонентов: скрытие/показ кнопок по роли
- `AdminUsersScreen` — полноценный интерфейс управления ролями
- `ManagerTeamScreen` — inter-user аналитика

---

### Этап 8 — Сборка и деплой

**Цель**: подготовить APK для установки на Android-устройства.

- Настроен `eas.json` с тремя профилями:
  - `preview` → APK для тестирования (передать другу/коллеге)
  - `development` → APK с dev-tools
  - `production` → AAB для Google Play
- Добавлен `android.package: "com.timetrackpro.app"` в `app.json`
- Включена `newArchEnabled: true` — новая Fabric-архитектура
- Запущена облачная сборка через **EAS Build** (Expo Application Services)
- Подписание: keystore создан автоматически серверами Expo с хранением ключей в EAS

---

## 4. ДОПОЛНИТЕЛЬНЫЕ ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Архитектурный паттерн: Feature-Sliced Design (FSD)

```
src/
├── app/           # Конфигурация приложения (навигация, провайдеры)
├── entities/      # Бизнес-сущности (User, Project, TimeEntry — типы + модели)
├── features/      # Бизнес-фичи (auth, timeTracking, projects, reports)
├── screens/       # Экраны приложения (составные страницы)
├── services/      # Сервисный слой (БД, репозитории)
├── shared/        # Общее (UI-компоненты, тема, утилиты, хуки)
└── store/         # Глобальный стейт (Zustand-сторы)
```

Это обеспечивает **чёткое разделение ответственности**: бизнес-логика не смешивается с UI, данные не смешиваются со стейтом.

### Типобезопасность

- Весь код написан на **TypeScript** без `any`-типов
- `tsc --noEmit` — компиляция проходит с 0 ошибок
- Строго типизированы: параметры навигации (`ProjectStackParamList`, `AdminStackParamList`), репозитории, стор-селекторы
- `UserRole = 'admin' | 'manager' | 'employee'` — Union Type исключает опечатки

### Размер приложения

- Бандл Expo export: **10.2 МБ**
- APK preview сборка: ~50–70 МБ (включает React Native runtime)
- SQLite-база на устройстве: растёт динамически, начинает с ~100 КБ

### Совместимость

- **Android**: 7.0+ (API 24+), `edgeToEdgeEnabled: true`
- **iOS**: 15.1+, поддержка планшетов (`supportsTablet: true`)
- **Ориентация**: только portrait (зафиксирована)

---

## 5. КАК ПРИЛОЖЕНИЕ ДОЛЖНО РАБОТАТЬ В PRODUCTION-СРЕДЕ

### Текущая архитектура vs Production

На данный момент приложение работает как **standalone mobile app** с локальной SQLite-базой на каждом устройстве. Это подходит для одиночного пользователя или демонстрации — но не для реального корпоративного использования командой. Ниже описана целевая production-архитектура.

---

### Целевая Production-архитектура

```
┌─────────────────────────────────────────────────────────┐
│                  КЛИЕНТСКИЙ УРОВЕНЬ                      │
│  iOS App (App Store)   Android App (Google Play)         │
│         ↕ HTTPS / JWT Bearer Token                       │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    API GATEWAY                           │
│   NGINX / AWS API Gateway / Kong                        │
│   • Rate Limiting (макс. 100 req/min с 1 IP)            │
│   • SSL Termination (TLS 1.3)                           │
│   • JWT-верификация входящих токенов                    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND (REST API)                      │
│   Node.js + Fastify / NestJS  или  .NET Core             │
│   • Аутентификация: JWT Access Token (15 мин)           │
│                   + Refresh Token (30 дней)              │
│   • Авторизация: RBAC middleware (admin/manager/employee)│
│   • Валидация: Zod / class-validator                    │
│   • Логирование: Winston + Morgan → ELK Stack           │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                СЛОЙ ДАННЫХ                               │
│   PostgreSQL 16  (основная БД)                          │
│   • Та же схема: users, projects, time_entries          │
│   • Индексы по user_id, project_id, start_time         │
│   • Партиционирование time_entries по месяцам           │
│                                                          │
│   Redis  (кэш + сессии)                                 │
│   • Refresh Tokens → хранятся в Redis с TTL             │
│   • Кэш командной статистики (инвалидация по событию)  │
└─────────────────────────────────────────────────────────┘
```

---

### Изменения, необходимые для перехода в Production

#### 1. Аутентификация — JWT вместо локальной сессии

**Сейчас**: пароль хэшируется и проверяется локально, сессия хранится в `expo-secure-store`.

**В production**:
- При логине клиент отправляет `POST /auth/login` с `{email, password}` на сервер
- Сервер проверяет `bcrypt.compare(password, storedHash)` (bcrypt с cost=12 вместо простого djb2)
- Сервер отвечает:
  ```json
  {
    "accessToken": "eyJ...",   // JWT, TTL = 15 минут
    "refreshToken": "abc...",  // Opaque token, TTL = 30 дней → хранится в Redis
    "user": { "id", "name", "role", ... }
  }
  ```
- `accessToken` хранится в памяти приложения (Zustand)
- `refreshToken` хранится в `expo-secure-store`
- Перед каждым API-запросом проверяется истечение `accessToken`, при необходимости — silent refresh через `POST /auth/refresh`

#### 2. Синхронизация данных между устройствами

**Сейчас**: данные живут только на одном телефоне — другие участники команды не видят записи друг друга в реальном времени.

**В production**:
- Все операции (create/update/delete записей и проектов) отправляются через REST API
- Сервер сохраняет данные в **PostgreSQL** — единое хранилище для всей команды
- **WebSocket (Socket.IO / Server-Sent Events)** — push-уведомления при:
  - Остановке таймера кем-то из команды
  - Создании нового проекта
  - Изменении роли пользователя
- Локальный SQLite остаётся как **offline-first кэш**: данные читаются из него, фоново синхронизируются с сервером

#### 3. Надёжность паролей

**Сейчас**: djb2-хэш + статическая соль `'tt_salt'` — простой алгоритм.

**В production**:
```
bcrypt(password, salt_rounds=12)
```
- bcrypt намеренно медленный — защита от brute force
- Каждый пароль имеет уникальную случайную соль (встроено в bcrypt)
- Минимальные требования: длина ≥8 символов, наличие цифры и заглавной буквы (валидация на клиенте + сервере)

#### 4. RBAC на уровне сервера

**Сейчас**: ограничения ролей — только на уровне UI (скрытые кнопки).

**В production**: каждый API-endpoint проверяет роль из JWT:
```
GET  /users          → только admin
PUT  /users/:id/role → только admin, нельзя менять собственную роль
GET  /team/stats     → admin + manager
POST /projects       → admin + manager
DELETE /projects/:id → admin + manager
GET  /entries/all    → admin + manager
```
Даже если злоумышленник получит accessToken сотрудника — он не сможет вызвать admin-эндпоинты.

#### 5. Логирование и мониторинг

**В production**:
- **Structured logging** (JSON) через Winston: каждый запрос логируется с `userId`, `method`, `path`, `statusCode`, `duration_ms`, `ip`
- **ELK Stack** (Elasticsearch + Logstash + Kibana) или **Datadog** — поиск и визуализация логов
- **Алерты**: Grafana + PagerDuty — уведомление при:
  - Error rate > 1% за 5 минут
  - P95 latency > 500ms
  - Упал pod в Kubernetes
- **Crash Reporting**: Sentry SDK в мобильном приложении — автоматический сбор stacktrace при крашах

#### 6. Инфраструктура и деплой

**В production**:
```
GitHub Actions CI/CD:
  ├── lint + tsc --noEmit
  ├── unit / integration tests
  ├── Docker build → push to ECR
  └── Deploy to Kubernetes (EKS / GKE)
      ├── 2+ реплики backend-сервиса
      ├── HorizontalPodAutoscaler (CPU > 70%)
      └── RollingUpdate (zero-downtime)

EAS Mobile CI/CD:
  ├── eas build (при мерже в main)
  └── eas submit → Google Play (TestTrack) / App Store (TestFlight)
```

#### 7. База данных в production

| Параметр | Dev (SQLite) | Production (PostgreSQL) |
|---|---|---|
| Хранение | Файл на устройстве | Managed DB (AWS RDS / Supabase) |
| Параллелизм | Один пользователь | Сотни одновременных подключений |
| Бэкапы | Нет | Автоматические снимки каждые 6 ч |
| Репликация | Нет | Primary + Read Replica |
| Партиционирование | Нет | time_entries по месяцам |
| Шифрование | Нет | AES-256 at rest |
| Мониторинг | Нет | pgBadger, pg_stat_statements |

#### 8. Безопасность в production

| Угроза | Защита |
|---|---|
| Брутфорс логина | Rate limiting: 5 попыток / 15 мин, captcha после 3 неудач |
| SQL-инъекции | Параметризованные запросы (уже реализовано) + ORM |
| XSS / CSRF | JWT в памяти (не в cookie), `Content-Security-Policy` заголовки |
| Man-in-the-Middle | TLS 1.3 + HSTS + Certificate Pinning в мобильном приложении |
| Утечка токенов | Short-lived accessToken (15 мин), Refresh Rotation (каждый refresh инвалидирует старый) |
| Несанкционированный доступ | RBAC middleware на каждом роуте (помимо UI-level guard) |
| DDoS | Cloudflare WAF + API Gateway Rate Limiting |

---

### Пример production-флоу: «Сотрудник логинится и трекает время»

```
1. Открытие приложения
   → App.tsx: restoreSession() из SecureStore
   → Если refresh-token жив → GET /auth/refresh → новый accessToken
   → Пользователь попадает в EmployeeNavigator

2. Открытие TrackingScreen
   → useTimeEntries(): GET /api/entries?userId=xxx (с JWT Bearer)
   → API Gateway: валидация JWT → роль extracted из payload
   → Backend: SELECT * FROM time_entries WHERE user_id = $1
   → React Query: кэш на 15 сек, данные в FlatList

3. Старт таймера
   → start(): Zustand.startTimer() — только в памяти (таймер локальный)
   → Каждую секунду: updateElapsed() — Zustand update, 0 запросов к БД

4. Остановка таймера
   → stop(): POST /api/entries { projectId, startTime, endTime, durationSeconds }
   → API Gateway: JWT verify
   → Backend: INSERT INTO time_entries + UPDATE projects SET total_seconds
   → WebSocket push: менеджер в ManagerTeamScreen получает обновление
   → React Query: invalidateQueries(['timeEntries', userId])
   → UI обновился, новая запись в списке

5. Провал сети (офлайн)
   → Zustand / React Query: данные из локального кэша (SQLite offline)
   → Запись в очередь синхронизации (Sync Queue)
   → При восстановлении сети — автоматическая отправка накопленных записей
```

---

### Резюме: что нужно доработать для полноценного Production

| Компонент | Статус сейчас | Что добавить |
|---|---|---|
| Аутентификация | Локальный djb2-хэш | JWT + bcrypt + Refresh Token Rotation |
| База данных | SQLite on-device | PostgreSQL на сервере (Supabase / RDS) |
| Синхронизация | Нет | REST API + offline-first очередь |
| Real-time обновления | Нет | WebSocket / SSE |
| RBAC | UI-level | Backend middleware + API-level guards |
| Логирование | Нет | Winston + ELK / Datadog + Sentry |
| CI/CD | EAS Build вручную | GitHub Actions + автосборка + OTA Updates |
| Мониторинг | Нет | Grafana + PagerDuty |
| Бэкапы | Нет | Automated snapshots каждые 6 ч |
| Масштабирование | 1 устройство | Kubernetes + HPA + Read Replica |

---

## 6. ЛОГИРОВАНИЕ

### Реализация

Логирование реализовано через **Winston** — библиотеку структурированных логов для Node.js.  
В зависимости от переменной окружения `NODE_ENV` активируется один из двух форматов:

| Режим | Формат | Назначение |
|---|---|---|
| `development` | Цветной текст с timestamp | Удобное чтение разработчиком в консоли |
| `production` | Структурированный JSON | Машинная обработка: ELK Stack, Datadog, Grafana Loki |

---

### Development — вывод в консоль

> Формат: `[TIMESTAMP] LEVEL: Сообщение { мета }`

```
[2026-05-03 09:00:01] info:  🚀 Server started on port 3000 {"env":"development"}

[2026-05-03 09:01:14] info:  → POST /api/auth/register 201 83ms {"ip":"192.168.1.12"}
[2026-05-03 09:01:14] debug: New user registered {"userId":"a3f8c1d2","email":"ivan@company.com","role":"employee"}

[2026-05-03 09:01:45] info:  → POST /api/auth/login 200 142ms {"ip":"192.168.1.12"}
[2026-05-03 09:01:45] debug: Access token issued {"userId":"a3f8c1d2","expiresIn":"15m"}

[2026-05-03 09:03:27] info:  → POST /api/entries 201 57ms {"ip":"192.168.1.12","userId":"a3f8c1d2"}
[2026-05-03 09:03:27] debug: Time entry created {"entryId":"e9b2a0f1","durationSeconds":3720}

[2026-05-03 09:04:01] warn:  Rate limit exceeded {"ip":"10.0.0.5","route":"/api/auth/login","limit":5}

[2026-05-03 09:04:15] info:  → POST /api/auth/login 401 44ms {"ip":"10.0.0.5"}
[2026-05-03 09:04:15] warn:  Failed login attempt {"email":"admin@company.com","ip":"10.0.0.5","reason":"Invalid password"}

[2026-05-03 09:05:00] info:  → GET /api/users 403 12ms {"userId":"b1c9e7f3","role":"employee"}
[2026-05-03 09:05:00] warn:  Forbidden access attempt {"userId":"b1c9e7f3","role":"employee","requiredRole":"admin"}

[2026-05-03 09:06:33] info:  → PUT /api/users/b1c9e7f3/role 200 61ms {"userId":"d0e1f2a3"}
[2026-05-03 09:06:33] info:  User role updated {"targetUserId":"b1c9e7f3","oldRole":"employee","newRole":"manager"}

[2026-05-03 09:07:11] debug: Refresh token rotated {"userId":"a3f8c1d2","oldTokenRevoked":true}

[2026-05-03 09:09:30] warn:  🚨 Replay attack detected — all sessions revoked {"userId":"f4a2c8b1","ip":"192.168.1.99"}

[2026-05-03 09:08:45] error: Database connection lost {"host":"localhost","port":5432,"code":"ECONNREFUSED"}
[2026-05-03 09:08:45] error: Query failed: connect ECONNREFUSED 127.0.0.1:5432
    at Pool.<anonymous> (/backend/src/config/database.js:28:15)
    at Pool.emit (node:events:514:28)
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1607:16)

[2026-05-03 17:59:58] info:  SIGTERM received — starting graceful shutdown
[2026-05-03 17:59:59] info:  PostgreSQL pool closed
[2026-05-03 17:59:59] info:  👋 Process exited cleanly
```

---

### Production — структурированный JSON

> Каждая строка = один JSON-объект. Читается Kibana / Datadog / Grafana Loki.

```json
{"level":"info","message":"🚀 Server started on port 3000","env":"production","timestamp":"2026-05-03T06:00:01.000Z"}
{"level":"info","message":"→ POST /api/auth/register 201 83ms","ip":"192.168.1.12","timestamp":"2026-05-03T06:01:14.123Z"}
{"level":"debug","message":"New user registered","userId":"a3f8c1d2","email":"ivan@company.com","role":"employee","timestamp":"2026-05-03T06:01:14.198Z"}
{"level":"info","message":"→ POST /api/auth/login 200 142ms","ip":"192.168.1.12","timestamp":"2026-05-03T06:01:45.301Z"}
{"level":"info","message":"→ POST /api/entries 201 57ms","ip":"192.168.1.12","userId":"a3f8c1d2","timestamp":"2026-05-03T06:03:27.552Z"}
{"level":"warn","message":"Rate limit exceeded","ip":"10.0.0.5","route":"/api/auth/login","limit":5,"timestamp":"2026-05-03T06:04:01.000Z"}
{"level":"warn","message":"Failed login attempt","email":"admin@company.com","ip":"10.0.0.5","reason":"Invalid password","timestamp":"2026-05-03T06:04:15.881Z"}
{"level":"warn","message":"Forbidden access attempt","userId":"b1c9e7f3","role":"employee","requiredRole":"admin","path":"/api/users","timestamp":"2026-05-03T06:05:00.211Z"}
{"level":"info","message":"User role updated","targetUserId":"b1c9e7f3","oldRole":"employee","newRole":"manager","changedBy":"d0e1f2a3","timestamp":"2026-05-03T06:06:33.009Z"}
{"level":"warn","message":"🚨 Replay attack detected — all sessions revoked","userId":"f4a2c8b1","ip":"192.168.1.99","timestamp":"2026-05-03T06:09:30.777Z"}
{"level":"error","message":"Database connection lost","host":"localhost","port":5432,"code":"ECONNREFUSED","timestamp":"2026-05-03T06:08:45.000Z"}
{"level":"error","message":"Unhandled rejection","error":"Cannot read properties of null","stack":"TypeError: Cannot read properties of null\n    at entryController.js:58:22","timestamp":"2026-05-03T06:12:01.000Z"}
{"level":"info","message":"SIGTERM received — starting graceful shutdown","timestamp":"2026-05-03T17:59:58.000Z"}
{"level":"info","message":"👋 Process exited cleanly","timestamp":"2026-05-03T17:59:59.500Z"}
```

---

### Уровни логирования

| Уровень | Цвет (dev) | Когда используется | Примеры событий |
|---|---|---|---|
| **error** | 🔴 Красный | Критические сбои, краши, потеря соединений | Потеря коннекта к БД, unhandled rejection |
| **warn** | 🟡 Жёлтый | Подозрительные события, нарушения доступа | Rate limit, неудачный вход, Forbidden, replay-атака |
| **info** | 🟢 Зелёный | Нормальный ход работы | HTTP-запрос завершён, сервер запущен, роль изменена |
| **debug** | 🔵 Синий | Детали операций (только dev) | Токен выдан, запись создана, транзакция выполнена |

---

### Что логируется автоматически на каждый HTTP-запрос

```javascript
// src/app.js — Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`→ ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`, {
      ip: req.ip,
      userId: req.user?.id,   // из JWT после authenticate middleware
    });
  });
  next();
});
```

Каждая строка `→ METHOD /path STATUS Xms` содержит: HTTP-метод, маршрут, код ответа, время выполнения, IP клиента и ID пользователя (если аутентифицирован).

---

### Карта событий → уровень лога

| Событие | Уровень |
|---|---|
| Сервер запущен / остановлен | `info` |
| HTTP-запрос завершён | `info` |
| Новый пользователь зарегистрирован | `debug` |
| JWT-токен выдан / обновлён | `debug` |
| Неверный пароль при входе | `warn` |
| Превышен rate limit | `warn` |
| Попытка доступа без нужной роли | `warn` |
| Обнаружена replay-атака (токен уже использован) | `warn` |
| Роль пользователя изменена администратором | `info` |
| Проект удалён с каскадным удалением записей | `debug` |
| Потеря соединения с PostgreSQL | `error` |
| Unhandled Promise rejection | `error` |
| Uncaught exception с полным stacktrace | `error` |

---

## 7. ИТОГОВАЯ СВОДКА ДЛЯ СЛАЙДА

> **TimeTrack Pro** — корпоративное мобильное приложение учёта рабочего времени с полноценной трёхуровневой архитектурой «клиент — сервер — база данных». Мобильное приложение на React Native + Expo SDK 54 взаимодействует с REST API на Node.js через защищённые JWT-запросы, данные хранятся в PostgreSQL с RBAC-защитой на каждом уровне системы.

---

### Стек в трёх словах

```
React Native      →       Node.js + Express      →      PostgreSQL 16
  (Expo SDK 54)          (REST API · JWT · RBAC)        (pg.Pool · SQL)
  20 зависимостей         13 зависимостей              4 таблицы · 6 индексов
  10 экранов              20+ эндпоинтов               партиционирование
  3 роли / навигатора     25 файлов                    транзакции · CASCADE
```

---

### Ключевые цифры

| Категория | Значение |
|---|---|
| Роли в системе | 3 (admin · manager · employee) |
| Экранов мобильного приложения | 10 |
| REST API эндпоинтов | 23 |
| Файлов бэкенда | 25 |
| Таблиц PostgreSQL | 4 (users, projects, time_entries, refresh_tokens) |
| SQL-индексов | 6 |
| TypeScript ошибок | 0 (`tsc --noEmit`) |
| Синтаксических ошибок бэкенда | 0 (`node --check` × 22 файла) |
| APK-бандл | ~50–70 МБ (EAS Build) |
| JS-бандл | 10.2 МБ |
| FPS анимации | 60 (Reanimated Worklets) |
| Access Token TTL | 15 минут |
| Refresh Token TTL | 30 дней |

---

### Безопасность — что реализовано

| Уровень | Защита |
|---|---|
| **Клиент** | Access Token только в памяти · Refresh Token в Keychain/Keystore · RBAC в навигаторах |
| **API** | Helmet + CORS + Rate Limiting · JWT verify на каждом запросе · Zod валидация · RBAC middleware |
| **Пароли** | bcrypt cost=12 · уникальная соль · dummy hash для несуществующих пользователей (константное время) |
| **Токены** | Refresh Token Rotation · SHA256 хэш в БД · replay attack → revoke all sessions |
| **БД** | Параметризованные запросы ($1..$N) · ENUM типы · FK CASCADE · SSL в production |
