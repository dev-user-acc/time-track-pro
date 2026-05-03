import { getDatabase } from '../database/database';
import { Project, CreateProjectData } from '../../entities/project/model/types';
import { generateId } from '../../shared/utils/uuid';
import type { SQLiteBindValue } from 'expo-sqlite';

const rowToProject = (row: Record<string, unknown>): Project => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    color: row.color as string,
    status: row.status as Project['status'],
    ownerId: row.owner_id as string,
    totalSeconds: (row.total_seconds as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
});

export const projectRepository = {
    async getAll(userId: string): Promise<Project[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<Record<string, unknown>>(
            'SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC',
            [userId]
        );
        return rows.map(rowToProject);
    },

    async getById(id: string): Promise<Project | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<Record<string, unknown>>(
            'SELECT * FROM projects WHERE id = ?',
            [id]
        );
        return row ? rowToProject(row) : null;
    },

    async create(userId: string, data: CreateProjectData): Promise<Project> {
        const db = await getDatabase();
        const id = generateId();
        const now = new Date().toISOString();
        await db.runAsync(
            `INSERT INTO projects (id, name, description, color, status, owner_id, total_seconds, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, 0, ?, ?)`,
            [id, data.name, data.description ?? '', data.color, userId, now, now]
        );
        return {
            id, name: data.name, description: data.description ?? '',
            color: data.color, status: 'active', ownerId: userId,
            totalSeconds: 0, createdAt: now, updatedAt: now,
        };
    },

    async update(id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'color' | 'status'>>): Promise<void> {
        const db = await getDatabase();
        const fields: string[] = [];
        const values: SQLiteBindValue[] = [];
        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
        if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
        if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
        if (fields.length === 0) return;
        const now = new Date().toISOString();
        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);
        await db.runAsync(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
    },

    async delete(id: string): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('DELETE FROM time_entries WHERE project_id = ?', [id]);
        await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
    },

    async updateTotalSeconds(id: string, userId: string): Promise<void> {
        const db = await getDatabase();
        const result = await db.getFirstAsync<{ total: number }>(
            'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM time_entries WHERE project_id = ? AND user_id = ?',
            [id, userId]
        );
        const now = new Date().toISOString();
        await db.runAsync('UPDATE projects SET total_seconds = ?, updated_at = ? WHERE id = ?', [
            result?.total ?? 0, now, id,
        ]);
    },
};
