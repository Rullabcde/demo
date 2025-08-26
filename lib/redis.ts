import Redis from "ioredis";

declare global {
  var redis: Redis | undefined;
}

function createRedisClient() {
  if (process.env.NODE_ENV !== "production" && global.redis) {
    return global.redis;
  }

  if (process.env.NEXT_PHASE?.startsWith("build") || !process.env.REDIS_HOST) {
    console.log(
      "Redis client not initialized (build phase or missing env variables)."
    );
    return null;
  }

  try {
    const client = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: false,
      maxRetriesPerRequest: undefined,
    });
    console.log("Redis client successfully connected.");

    if (process.env.NODE_ENV !== "production") {
      global.redis = client;
    }

    return client;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    return null;
  }
}

export const redis = createRedisClient();
