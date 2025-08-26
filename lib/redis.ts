import Redis from "ioredis";

declare global {
  var redis: Redis | null | undefined;
}

function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE?.startsWith("build") ||
    process.env.NODE_ENV === "test" ||
    !process.env.REDIS_HOST
  );
}

function createRedisClient(): Redis | null {
  if (isBuildTime()) {
    console.log(
      "Redis client not initialized (build phase, test environment, or missing env variables)."
    );
    return null;
  }

  if (process.env.NODE_ENV !== "production" && global.redis !== undefined) {
    return global.redis;
  }

  try {
    const client = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Prevents immediate connection during import
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    client.on("connect", () => {
      console.log("Redis client successfully connected.");
    });

    client.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    client.on("ready", () => {
      console.log("Redis client is ready.");
    });

    if (process.env.NODE_ENV !== "production") {
      global.redis = client;
    }

    return client;
  } catch (error) {
    console.error("Failed to create Redis client:", error);
    return null;
  }
}

export const redis = createRedisClient();

export async function safeRedisOperation<T>(
  operation: (client: Redis) => Promise<T>,
  fallback: T
): Promise<T> {
  if (!redis) {
    return fallback;
  }

  try {
    return await operation(redis);
  } catch (error) {
    console.error("Redis operation failed:", error);
    return fallback;
  }
}
