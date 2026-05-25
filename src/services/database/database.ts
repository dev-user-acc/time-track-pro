import * as SQLite from 'expo-sqlite';
import { DEMO_USERS } from '../../entities/user/model/demoUsers';
import { generateRandomAlmatyLocation } from '../../shared/utils/location';

let _db: SQLite.SQLiteDatabase | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (_db) return _db;
    _db = await SQLite.openDatabaseAsync('timetrack.db');
    await initializeSchema(_db);
    await seedDemoData(_db);
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
      location_lat REAL,
      location_lng REAL,
      location_label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user ON time_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_entries_start ON time_entries(start_time);
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
  `);

    await ensureColumnExists(db, 'time_entries', 'location_lat', 'REAL');
    await ensureColumnExists(db, 'time_entries', 'location_lng', 'REAL');
    await ensureColumnExists(db, 'time_entries', 'location_label', "TEXT NOT NULL DEFAULT ''");
};

  const ensureColumnExists = async (
    db: SQLite.SQLiteDatabase,
    tableName: 'time_entries',
    columnName: 'location_lat' | 'location_lng' | 'location_label',
    columnDefinition: string
  ): Promise<void> => {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
    const hasColumn = columns.some((col) => col.name === columnName);

    if (!hasColumn) {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
    }
  };

const seedDemoData = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const toIsoHoursAgo = (hoursAgo: number): string =>
    new Date(nowMs - hoursAgo * 60 * 60 * 1000).toISOString();
  const demoUserIdByEmail = new Map<string, string>();

  for (const demoUser of DEMO_USERS) {
    const demoEmail = demoUser.email.toLowerCase();
    await db.runAsync(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        demoUser.id,
        demoEmail,
        simpleHash(demoUser.password + 'tt_salt'),
        demoUser.name,
        demoUser.role,
        demoUser.avatarColor,
        nowIso,
      ]
    );

    const existingUser = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      [demoEmail]
    );
    if (existingUser?.id) {
      demoUserIdByEmail.set(demoEmail, existingUser.id);
    }
  }

  const adminUserId = demoUserIdByEmail.get('admin@timetrack.demo') ?? 'demo-admin-001';
  const managerUserId = demoUserIdByEmail.get('manager@timetrack.demo') ?? 'demo-manager-001';
  const employeeUserId = demoUserIdByEmail.get('employee@timetrack.demo') ?? 'demo-employee-001';

  const demoProjects = [
    {
      id: 'demo-project-admin-001',
      ownerId: adminUserId,
      name: 'Администрирование платформы',
      description: 'Права доступа и аудит системы',
      color: '#f472b6',
      status: 'active',
    },
    {
      id: 'demo-project-manager-001',
      ownerId: managerUserId,
      name: 'Планирование спринта',
      description: 'План задач и синхронизация команды',
      color: '#f59e0b',
      status: 'active',
    },
    {
      id: 'demo-project-employee-001',
      ownerId: employeeUserId,
      name: 'Разработка клиентских фич',
      description: 'Разработка функционала и исправление багов',
      color: '#00d4ff',
      status: 'active',
    },
  ];

  const pickDemoLocation = (seed: string) => {
    const loc = generateRandomAlmatyLocation(seed);
    return {
      locationLat: loc.latitude,
      locationLng: loc.longitude,
      locationLabel: loc.label,
    };
  };

  for (const project of demoProjects) {
    await db.runAsync(
      `INSERT OR IGNORE INTO projects
     (id, name, description, color, status, owner_id, total_seconds, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        project.id,
        project.name,
        project.description,
        project.color,
        project.status,
        project.ownerId,
        nowIso,
        nowIso,
      ]
    );

      await db.runAsync(
        `UPDATE projects
       SET name = ?, description = ?, color = ?, status = ?, owner_id = ?, updated_at = ?
       WHERE id = ?`,
        [
          project.name,
          project.description,
          project.color,
          project.status,
          project.ownerId,
          nowIso,
          project.id,
        ]
      );
  }

  const demoEntries = [
    {
      id: 'demo-entry-admin-001',
      userId: adminUserId,
      projectId: 'demo-project-admin-001',
      projectName: 'Администрирование платформы',
      projectColor: '#f472b6',
      description: 'Проверка матрицы доступов',
      startTime: toIsoHoursAgo(30),
      endTime: toIsoHoursAgo(28.5),
      durationSeconds: 5400,
      createdAt: toIsoHoursAgo(28.4),
      ...pickDemoLocation('demo-entry-admin-001'),
    },
    {
      id: 'demo-entry-admin-002',
      userId: adminUserId,
      projectId: 'demo-project-admin-001',
      projectName: 'Администрирование платформы',
      projectColor: '#f472b6',
      description: 'Аудит ролей и разрешений',
      startTime: toIsoHoursAgo(7),
      endTime: toIsoHoursAgo(6),
      durationSeconds: 3600,
      createdAt: toIsoHoursAgo(5.9),
      ...pickDemoLocation('demo-entry-admin-002'),
    },
    {
      id: 'demo-entry-manager-001',
      userId: managerUserId,
      projectId: 'demo-project-manager-001',
      projectName: 'Планирование спринта',
      projectColor: '#f59e0b',
      description: 'Приоритизация бэклога',
      startTime: toIsoHoursAgo(26),
      endTime: toIsoHoursAgo(24),
      durationSeconds: 7200,
      createdAt: toIsoHoursAgo(23.9),
      ...pickDemoLocation('demo-entry-manager-001'),
    },
    {
      id: 'demo-entry-manager-002',
      userId: managerUserId,
      projectId: 'demo-project-manager-001',
      projectName: 'Планирование спринта',
      projectColor: '#f59e0b',
      description: 'Синк с командой',
      startTime: toIsoHoursAgo(12),
      endTime: toIsoHoursAgo(10.5),
      durationSeconds: 5400,
      createdAt: toIsoHoursAgo(10.4),
      ...pickDemoLocation('demo-entry-manager-002'),
    },
    {
      id: 'demo-entry-manager-003',
      userId: managerUserId,
      projectId: 'demo-project-manager-001',
      projectName: 'Планирование спринта',
      projectColor: '#f59e0b',
      description: 'Оценка задач',
      startTime: toIsoHoursAgo(4.5),
      endTime: toIsoHoursAgo(3.25),
      durationSeconds: 4500,
      createdAt: toIsoHoursAgo(3.2),
      ...pickDemoLocation('demo-entry-manager-003'),
    },
    {
      id: 'demo-entry-employee-001',
      userId: employeeUserId,
      projectId: 'demo-project-employee-001',
      projectName: 'Разработка клиентских фич',
      projectColor: '#00d4ff',
      description: 'Реализация модуля уведомлений',
      startTime: toIsoHoursAgo(22),
      endTime: toIsoHoursAgo(19),
      durationSeconds: 10800,
      createdAt: toIsoHoursAgo(18.9),
      ...pickDemoLocation('demo-entry-employee-001'),
    },
    {
      id: 'demo-entry-employee-002',
      userId: employeeUserId,
      projectId: 'demo-project-employee-001',
      projectName: 'Разработка клиентских фич',
      projectColor: '#00d4ff',
      description: 'Исправление критического бага #142',
      startTime: toIsoHoursAgo(9.5),
      endTime: toIsoHoursAgo(7.75),
      durationSeconds: 6300,
      createdAt: toIsoHoursAgo(7.7),
      ...pickDemoLocation('demo-entry-employee-002'),
    },
    {
      id: 'demo-entry-employee-003',
      userId: employeeUserId,
      projectId: 'demo-project-employee-001',
      projectName: 'Разработка клиентских фич',
      projectColor: '#00d4ff',
      description: 'Код-ревью и поддержка QA',
      startTime: toIsoHoursAgo(5),
      endTime: toIsoHoursAgo(3.67),
      durationSeconds: 4800,
      createdAt: toIsoHoursAgo(3.6),
      ...pickDemoLocation('demo-entry-employee-003'),
    },
  ];

  for (const entry of demoEntries) {
    await db.runAsync(
      `INSERT OR IGNORE INTO time_entries
     (id, user_id, project_id, project_name, project_color, description, start_time, end_time, duration_seconds, created_at, location_lat, location_lng, location_label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.userId,
        entry.projectId,
        entry.projectName,
        entry.projectColor,
        entry.description,
        entry.startTime,
        entry.endTime,
        entry.durationSeconds,
        entry.createdAt,
        entry.locationLat,
        entry.locationLng,
        entry.locationLabel,
      ]
    );

      await db.runAsync(
        `UPDATE time_entries
       SET user_id = ?, project_id = ?, project_name = ?, project_color = ?, description = ?,
           start_time = ?, end_time = ?, duration_seconds = ?, created_at = ?,
           location_lat = ?, location_lng = ?, location_label = ?
       WHERE id = ?`,
        [
          entry.userId,
          entry.projectId,
          entry.projectName,
          entry.projectColor,
          entry.description,
          entry.startTime,
          entry.endTime,
          entry.durationSeconds,
          entry.createdAt,
          entry.locationLat,
          entry.locationLng,
          entry.locationLabel,
          entry.id,
        ]
      );
  }

  for (const project of demoProjects) {
    await db.runAsync(
      `UPDATE projects
     SET total_seconds = COALESCE((SELECT SUM(duration_seconds) FROM time_entries WHERE project_id = ?), 0),
      updated_at = ?
     WHERE id = ?`,
      [project.id, nowIso, project.id]
    );
  }
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
