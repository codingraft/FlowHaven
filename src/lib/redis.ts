import Redis from 'ioredis';

type RedisLike = {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
    del(...keys: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
};

type MemoryEntry = {
    value: string;
    expiresAt?: number;
};

const globalForRedis = global as unknown as {
    redis?: RedisLike;
    memoryRedisStore?: Map<string, MemoryEntry>;
};

function makeMemoryRedis(): RedisLike {
    const store = globalForRedis.memoryRedisStore ?? new Map<string, MemoryEntry>();
    globalForRedis.memoryRedisStore = store;

    const isExpired = (entry: MemoryEntry | undefined) =>
        !!entry?.expiresAt && entry.expiresAt <= Date.now();

    const cleanup = (key: string) => {
        const entry = store.get(key);
        if (isExpired(entry)) store.delete(key);
    };

    return {
        async get(key: string) {
            cleanup(key);
            return store.get(key)?.value ?? null;
        },
        async set(key: string, value: string, ...args: Array<string | number>) {
            const entry: MemoryEntry = { value };
            if (args.length >= 2 && String(args[0]).toUpperCase() === 'EX') {
                const ttl = Number(args[1]);
                if (Number.isFinite(ttl) && ttl > 0) {
                    entry.expiresAt = Date.now() + ttl * 1000;
                }
            }
            store.set(key, entry);
            return 'OK';
        },
        async del(...keys: string[]) {
            let deleted = 0;
            for (const key of keys) {
                if (store.delete(key)) deleted++;
            }
            return deleted;
        },
        async keys(pattern: string) {
            const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
            const result: string[] = [];
            for (const key of store.keys()) {
                cleanup(key);
                if (store.has(key) && regex.test(key)) result.push(key);
            }
            return result;
        },
        async incr(key: string) {
            cleanup(key);
            const current = Number(store.get(key)?.value ?? '0') || 0;
            const next = current + 1;
            const prev = store.get(key);
            store.set(key, { value: String(next), expiresAt: prev?.expiresAt });
            return next;
        },
        async expire(key: string, seconds: number) {
            const entry = store.get(key);
            if (!entry) return 0;
            entry.expiresAt = Date.now() + seconds * 1000;
            store.set(key, entry);
            return 1;
        },
    };
}

function makeRedisClient(): RedisLike {
    if (!process.env.REDIS_URL) return makeMemoryRedis();

    const client = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times) {
            // Stop reconnecting after 3 attempts — we'll fall back to memory.
            if (times > 3) return null;
            return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
    });

    let dead = false;

    client.on('error', (err) => {
        if (!dead) console.error('Redis connection error (falling back to in-memory):', err.message);
        dead = true;
    });

    // Try to connect — if it fails the 'error' handler sets dead = true.
    client.connect().catch(() => { dead = true; });

    const mem = makeMemoryRedis();

    // Proxy: forward to Redis if alive, otherwise fall back to in-memory store.
    const proxy: RedisLike = {
        get: (...a) => dead ? mem.get(...a) : client.get(...a).catch(() => { dead = true; return mem.get(...a); }) as Promise<string | null>,
        set: (...a) => dead ? mem.set(...a) : (client as unknown as RedisLike).set(...a).catch(() => { dead = true; return mem.set(...a); }),
        del: (...a) => dead ? mem.del(...a) : client.del(...a).catch(() => { dead = true; return mem.del(...a); }),
        keys: (...a) => dead ? mem.keys(...a) : client.keys(...a).catch(() => { dead = true; return mem.keys(...a); }),
        incr: (...a) => dead ? mem.incr(...a) : client.incr(...a).catch(() => { dead = true; return mem.incr(...a); }),
        expire: (...a) => dead ? mem.expire(...a) : client.expire(...a).catch(() => { dead = true; return mem.expire(...a); }),
    };

    return proxy;
}

export const redis: RedisLike = globalForRedis.redis ?? makeRedisClient();

if (process.env.NODE_ENV !== 'production') {
    globalForRedis.redis = redis;
}

export const isRedisEnabled = Boolean(process.env.REDIS_URL);
