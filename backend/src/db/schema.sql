-- src/db/schema.sql
-- PostgreSQL-схема для TimeTrack Pro.
-- Аналогична SQLite-схеме клиента, но адаптирована под PostgreSQL:
--   - UUID вместо TEXT PRIMARY KEY
--   - TIMESTAMPTZ (timezone-aware) вместо TEXT
--   - ENUM-типы для role и status
--   - Партиционирование time_entries по месяцам (production-масштабирование)

-- ─────────────────────────────────────────────
--  ENUM-типы
-- ─────────────────────────────────────────────
CREATE TYPE user_role    AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed', 'archived');

-- ─────────────────────────────────────────────
--  Таблица пользователей
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,             -- bcrypt hash (cost=12)
  name          TEXT        NOT NULL,
  role          user_role   NOT NULL DEFAULT 'employee',
  avatar_color  TEXT        NOT NULL DEFAULT '#00d4ff',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  Refresh tokens (хранение на стороне сервера для возможности отзыва)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT        NOT NULL UNIQUE,         -- SHA256(refreshToken) — не храним сам токен
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked    BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ─────────────────────────────────────────────
--  Таблица проектов
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT           NOT NULL,
  description    TEXT           NOT NULL DEFAULT '',
  color          TEXT           NOT NULL DEFAULT '#00d4ff',
  status         project_status NOT NULL DEFAULT 'active',
  owner_id       UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_seconds  BIGINT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  Таблица временных записей (партиционирована по месяцу start_time)
--  В production это позволяет быстро запрашивать данные за конкретный период
--  и архивировать/удалять старые партиции без блокировки таблицы.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS time_entries (
  id               UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_name     TEXT        NOT NULL,   -- денормализация для скорости выборки
  project_color    TEXT        NOT NULL DEFAULT '#00d4ff',
  description      TEXT        NOT NULL DEFAULT '',
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ,            -- NULL пока таймер активен
  duration_seconds INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, start_time)             -- составной PK нужен для партиционирования
) PARTITION BY RANGE (start_time);

-- Создаём партиции на 2025–2026 год (добавляются автоматически миграцией)
CREATE TABLE IF NOT EXISTS time_entries_2025
  PARTITION OF time_entries
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS time_entries_2026
  PARTITION OF time_entries
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS time_entries_default
  PARTITION OF time_entries DEFAULT;

-- ─────────────────────────────────────────────
--  Индексы производительности
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_entries_user_id    ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_entries_start_time ON time_entries(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id  ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_refresh_user       ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_start ON time_entries(user_id, start_time DESC);

-- ─────────────────────────────────────────────
--  Триггер: автоматически обновляем updated_at у projects
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
