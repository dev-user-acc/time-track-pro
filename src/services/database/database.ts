import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (_db) return _db;
    _db = await SQLite.openDatabaseAsync('timetrack.db');
    await initializeSchema(_db);
    return _db;
};

const initializeSchema = async (db: SQLite.SQLiteDatabase): Promise<void> => {
    await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      avatar_color TEXT NOT NULL DEFAULT '#00d4ff',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT NOT NULL DEFAULT '#00d4ff',
      status TEXT NOT NULL DEFAULT 'active',
      owner_id TEXT NOT NULL,
      total_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      project_name TEXT NOT NULL,
      project_color TEXT NOT NULL DEFAULT '#00d4ff',
      description TEXT DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user ON time_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_entries_start ON time_entries(start_time);
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
  `);
};

export const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
};
