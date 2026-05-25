import { getDatabase, simpleHash } from '../database/database';
import { User, UserRole, AuthCredentials, RegisterData } from '../../entities/user/model/types';
import { generateId } from '../../shared/utils/uuid';
import { Colors } from '../../shared/theme/colors';

const pickAvatarColor = (): string => {
    const colors = Colors.projectColors;
    return colors[Math.floor(Math.random() * colors.length)];
};

const rowToUser = (row: {
    id: string; email: string; name: string; role: string;
    avatar_color: string; created_at: string;
}): User => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
    avatarColor: row.avatar_color,
    createdAt: row.created_at,
});

export const userRepository = {
    async register(data: RegisterData): Promise<User> {
        const db = await getDatabase();
        const email = data.email.trim().toLowerCase();
        const name = data.name.trim();
        const password = data.password;

        if (!email || !name) {
            throw new Error('Введите имя и email');
        }
        if (password.length < 6) {
            throw new Error('Пароль должен быть не короче 6 символов');
        }

        const existing = await db.getFirstAsync<{ id: string }>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        if (existing) throw new Error('Пользователь с таким email уже зарегистрирован');

        const id = generateId();
        const passwordHash = simpleHash(password + 'tt_salt');
        const avatarColor = pickAvatarColor();
        const now = new Date().toISOString();
        const role = data.role ?? 'employee';

        await db.runAsync(
            `INSERT INTO users (id, email, password_hash, name, role, avatar_color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, email, passwordHash, name, role, avatarColor, now]
        );

        return { id, email, name, role, avatarColor, createdAt: now };
    },

    async login(creds: AuthCredentials): Promise<User> {
        const db = await getDatabase();
        const email = creds.email.trim().toLowerCase();
        const password = creds.password;

        if (!email || !password) {
            throw new Error('Введите email и пароль');
        }

        const passwordHash = simpleHash(password + 'tt_salt');
        const row = await db.getFirstAsync<{
            id: string; email: string; name: string; role: string;
            avatar_color: string; created_at: string;
        }>(
            'SELECT id, email, name, role, avatar_color, created_at FROM users WHERE email = ? AND password_hash = ?',
            [email, passwordHash]
        );
        if (!row) throw new Error('Неверный email или пароль');
        return rowToUser(row);
    },

    async findById(id: string): Promise<User | null> {
        const db = await getDatabase();
        const row = await db.getFirstAsync<{
            id: string; email: string; name: string; role: string;
            avatar_color: string; created_at: string;
        }>('SELECT id, email, name, role, avatar_color, created_at FROM users WHERE id = ?', [id]);
        if (!row) return null;
        return rowToUser(row);
    },

    async getAll(): Promise<User[]> {
        const db = await getDatabase();
        const rows = await db.getAllAsync<{
            id: string; email: string; name: string; role: string;
            avatar_color: string; created_at: string;
        }>('SELECT id, email, name, role, avatar_color, created_at FROM users ORDER BY created_at ASC');
        return rows.map(rowToUser);
    },

    async updateRole(userId: string, role: UserRole): Promise<void> {
        const db = await getDatabase();
        await db.runAsync('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    },

    async getUserStats(userId: string): Promise<{ totalSeconds: number; projectCount: number }> {
        const db = await getDatabase();
        const timeRow = await db.getFirstAsync<{ total: number }>(
            'SELECT COALESCE(SUM(duration_seconds), 0) as total FROM time_entries WHERE user_id = ?',
            [userId]
        );
        const projRow = await db.getFirstAsync<{ cnt: number }>(
            'SELECT COUNT(DISTINCT project_id) as cnt FROM time_entries WHERE user_id = ?',
            [userId]
        );
        return {
            totalSeconds: timeRow?.total ?? 0,
            projectCount: projRow?.cnt ?? 0,
        };
    },
};
