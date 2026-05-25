interface LocationSeedSource {
    id: string;
    startTime?: string;
    locationLat?: number | null;
    locationLng?: number | null;
    locationLabel?: string | null;
}

export interface EntryLocation {
    latitude: number;
    longitude: number;
    label: string;
}

const ALMATY_CENTER = {
    lat: 43.238949,
    lng: 76.889709,
};

const ALMATY_AREAS = [
    'Алматы, Медеуский район',
    'Алматы, Бостандыкский район',
    'Алматы, Алмалинский район',
    'Алматы, Ауэзовский район',
    'Алматы, Наурызбайский район',
    'Алматы, Турксибский район',
    'Алматы, Жетысуский район',
    'Алматы, Алатауский район',
];

const normalizeSeed = (seed: string): number => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
};

const seededUnit = (seedValue: number, shift: number): number => {
    const value = Math.sin(seedValue * 0.00013 + shift * 12.9898) * 43758.5453;
    return value - Math.floor(value);
};

export const generateRandomAlmatyLocation = (seed?: string): EntryLocation => {
    const base = seed ? normalizeSeed(seed) : Math.floor(Math.random() * 1_000_000);

    // ~2-9 км от центра, чтобы точки были в пределах города.
    const radiusKm = 2 + seededUnit(base, 1) * 7;
    const angle = seededUnit(base, 2) * Math.PI * 2;

    const latOffset = (radiusKm / 111) * Math.cos(angle);
    const lngOffset = (radiusKm / (111 * Math.cos((ALMATY_CENTER.lat * Math.PI) / 180))) * Math.sin(angle);

    const latitude = ALMATY_CENTER.lat + latOffset;
    const longitude = ALMATY_CENTER.lng + lngOffset;

    const areaIdx = Math.floor(seededUnit(base, 3) * ALMATY_AREAS.length) % ALMATY_AREAS.length;

    return {
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
        label: ALMATY_AREAS[areaIdx],
    };
};

export const resolveEntryLocation = (entry: LocationSeedSource): EntryLocation => {
    if (
        typeof entry.locationLat === 'number' &&
        Number.isFinite(entry.locationLat) &&
        typeof entry.locationLng === 'number' &&
        Number.isFinite(entry.locationLng)
    ) {
        return {
            latitude: entry.locationLat,
            longitude: entry.locationLng,
            label: entry.locationLabel?.trim() || 'Алматы',
        };
    }

    const fallbackSeed = `${entry.id}-${entry.startTime ?? ''}`;
    return generateRandomAlmatyLocation(fallbackSeed);
};

export const formatLocation = (entry: LocationSeedSource): string => {
    const loc = resolveEntryLocation(entry);
    return `${loc.label}: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;
};

export const getMapsUrl = (latitude: number, longitude: number, label?: string): string => {
    const query = label
        ? `${latitude},${longitude} (${label})`
        : `${latitude},${longitude}`;

    return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
};
