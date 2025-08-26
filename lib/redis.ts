import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  if (process.env.NEXT_PHASE?.startsWith("build")) {
    console.log("Skipping Redis connection during build phase");
    return undefined;
  }

  return (
    globalForRedis.redis ??
    new Redis({
      host: process.env.REDIS_HOST || "redis",
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: false,
      maxRetriesPerRequest: undefined,
    })
  );
}

export const redis = createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}
