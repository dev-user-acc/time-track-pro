export const today = (): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

export const startOfWeek = (date: Date = new Date()): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

export const startOfMonth = (date: Date = new Date()): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
};

export const isSameDay = (a: Date, b: Date): boolean => {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
};

export const formatDateShort = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDateFull = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

export const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

export const getLast7Days = (): Date[] => {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - 6 + i);
        d.setHours(0, 0, 0, 0);
        return d;
    });
};

export const toISODateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};
