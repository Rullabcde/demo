import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Augment the global object's type to include our custom property
declare global {
  // eslint-disable-next-line no-var
  var __db: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // Check if __db exists on the global object.
  // We can now do this without casting to `any`.
  if (!global.__db) {
    global.__db = new PrismaClient();
  }
  prisma = global.__db;
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

    return NextResponse.json(healthData, { status: 200 });
  } catch (error: unknown) {
    // Use `unknown` and then perform a type check to access error properties
    if (error instanceof Error) {
      console.error("Health check failed:", error);
      return NextResponse.json(
        {
          status: "unhealthy",
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    // Handle cases where the error is not an Error object
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "An unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
