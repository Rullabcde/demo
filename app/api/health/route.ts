import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!(global as any).__db) {
    (global as any).__db = new PrismaClient();
  }
  prisma = (global as any).__db;
}

export async function GET() {
  try {
    // Cek koneksi database
    await prisma.$queryRaw`SELECT 1 as health`;

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || "unknown",
      instance: process.env.INSTANCE_ID || "unknown",
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      node_env: process.env.NODE_ENV,
    };

    return Response.json(healthData, { status: 200 });
  } catch (error: any) {
    console.error("Health check failed:", error);

    return Response.json(
      {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
