import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    retryStrategy: function (times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableReadyCheck: false,
    maxRetriesPerRequest: undefined,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
