import { getDatabase } from '../database/database';
import { TimeEntry, CreateTimeEntryData } from '../../entities/timeEntry/model/types';
import { generateId } from '../../shared/utils/uuid';

const rowToEntry = (row: Record<string, unknown>): TimeEntry => ({
    id: row.id as string,
    userId: row.user_id as string,
    projectId: row.project_id as string,
    projectName: row.project_name as string,
    projectColor: (row.project_color as string) ?? '#00d4ff',
    description: (row.description as string) ?? '',
    startTime: row.start_time as string,
    endTime: (row.end_time as string) ?? null,
    durationSeconds: (row.duration_seconds as number) ?? 0,
    createdAt: row.created_at as string,
});

export const timeEntryRepository = {
    async getByUser(userId: string, limit = 50): Promise<TimeEntry[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<Record<string, unknown>>(
            'SELECT * FROM time_entries WHERE user_id = ? ORDER BY start_time DESC LIMIT ?',
            [userId, limit]
        );
        return rows.map(rowToEntry);
    },

    async getByProject(projectId: string, userId: string): Promise<TimeEntry[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<Record<string, unknown>>(
            'SELECT * FROM time_entries WHERE project_id = ? AND user_id = ? ORDER BY start_time DESC',
            [projectId, userId]
        );
        return rows.map(rowToEntry);
    },

    async getByDateRange(userId: string, from: string, to: string): Promise<TimeEntry[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<Record<string, unknown>>(
            `SELECT * FROM time_entries
       WHERE user_id = ? AND start_time >= ? AND start_time < ?
       ORDER BY start_time DESC`,
            [userId, from, to]
        );
        return rows.map(rowToEntry);
    },

    async create(userId: string, data: CreateTimeEntryData & { projectName: string; projectColor: string }): Promise<TimeEntry> {
        const db = await getDatabase();
        const id = generateId();
        const now = new Date().toISOString();
        await db.runAsync(
            `INSERT INTO time_entries
         (id, user_id, project_id, project_name, project_color, description, start_time, end_time, duration_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, userId, data.projectId, data.projectName, data.projectColor,
                data.description ?? '', data.startTime, data.endTime,
                data.durationSeconds, now,
            ]
        );
        return {
            id, userId, projectId: data.projectId,
            projectName: data.projectName, projectColor: data.projectColor,
            description: data.description ?? '',
            startTime: data.startTime, endTime: data.endTime,
            durationSeconds: data.durationSeconds, createdAt: now,
        };
    },

    async delete(id: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM time_entries WHERE id = ?', [id]);
    },

    async getTodaySeconds(userId: string): Promise<number> {
        const db = await getDatabase();
        const todayStr = new Date().toISOString().split('T')[0];
        const result = await db.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(duration_seconds), 0) as total
       FROM time_entries WHERE user_id = ? AND start_time >= ?`,
            [userId, todayStr + 'T00:00:00.000Z']
        );
        return result?.total ?? 0;
    },

    async getWeekSeconds(userId: string): Promise<number> {
        const db = await getDatabase();
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const result = await db.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(duration_seconds), 0) as total
       FROM time_entries WHERE user_id = ? AND start_time >= ?`,
            [userId, weekStart.toISOString()]
        );
        return result?.total ?? 0;
    },

    async getDailySeconds(userId: string, days: string[]): Promise<Record<string, number>> {
        const db = await getDatabase();
        const result: Record<string, number> = {};
        for (const day of days) {
            const from = day + 'T00:00:00.000Z';
            const to = day + 'T23:59:59.999Z';
            const row = await db.getFirstAsync<{ total: number }>(
                `SELECT COALESCE(SUM(duration_seconds), 0) as total
         FROM time_entries WHERE user_id = ? AND start_time >= ? AND start_time <= ?`,
                [userId, from, to]
            );
            result[day] = row?.total ?? 0;
        }
        return result;
    },

    /** Get recent entries for ALL users — used by admin/manager team view */
    async getAllUsersEntries(limit = 100): Promise<TimeEntry[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<Record<string, unknown>>(
            'SELECT * FROM time_entries ORDER BY start_time DESC LIMIT ?',
            [limit]
        );
        return rows.map(rowToEntry);
    },

    /** Aggregated stats per user — used by manager/admin team view */
    async getTeamStats(): Promise<Array<{ userId: string; totalSeconds: number; entryCount: number }>> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{ user_id: string; total: number; cnt: number }>(
            `SELECT user_id, COALESCE(SUM(duration_seconds), 0) as total, COUNT(*) as cnt
       FROM time_entries GROUP BY user_id`
        );
        return rows.map((r) => ({ userId: r.user_id, totalSeconds: r.total, entryCount: r.cnt }));
    },
};
