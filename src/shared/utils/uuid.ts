const chars = '0123456789abcdef';

export const generateId = (): string => {
    let uuid = '';
    for (let i = 0; i < 32; i++) {
        const r = Math.floor(Math.random() * 16);
        if (i === 8 || i === 12 || i === 16 || i === 20) uuid += '-';
        if (i === 12) uuid += '4';
        else if (i === 16) uuid += chars[(r & 0x3) | 0x8];
        else uuid += chars[r];
    }
    return uuid;
};
