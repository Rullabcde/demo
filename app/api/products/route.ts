import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, safeRedisOperation } from "@/lib/redis";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// GET - Fetch all products
export async function GET() {
  try {
    // Try to get from cache safely
    const cachedProducts = await safeRedisOperation(async (client) => {
      const data = await client.get("products:all");
      return data;
    }, null);

    if (cachedProducts) {
      console.log("[API] Returning products from Redis cache");
      return NextResponse.json(JSON.parse(cachedProducts));
    }

    console.log("[API] Fetching products from database");
    const products = await prisma.product.findMany();

    // Cache the result safely
    await safeRedisOperation(async (client) => {
      await client.setex("products:all", 600, JSON.stringify(products));
      console.log("[API] Products cached successfully");
      return true;
    }, false);

    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error("Error fetching products:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST - Create a new product
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      price?: number | string;
      description?: string;
    };

    const { name, price, description } = body;

    if (!name || !price || !description) {
      return NextResponse.json(
        { error: "Name, price, and description are required" },
        { status: 400 }
      );
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        description,
      },
    });

    // Invalidate cache safely
    await safeRedisOperation(async (client) => {
      await client.del("products:all");
      console.log("[API] Cache invalidated after product creation");
      return true;
    }, false);

    return NextResponse.json(newProduct);
  } catch (error: unknown) {
    console.error("Error creating product:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

// Alternative approach: Direct safe checks (if you prefer not using helper function)
export async function GET_ALTERNATIVE() {
  try {
    let cachedProducts: string | null = null;

    // Safe Redis get operation
    if (redis) {
      try {
        cachedProducts = await redis.get("products:all");
      } catch (error) {
        console.error("Redis get operation failed:", error);
        cachedProducts = null;
      }
    }

    if (cachedProducts) {
      console.log("[API] Returning products from Redis cache");
      return NextResponse.json(JSON.parse(cachedProducts));
    }

    console.log("[API] Fetching products from database");
    const products = await prisma.product.findMany();

    // Safe Redis set operation
    if (redis) {
      try {
        await redis.setex("products:all", 600, JSON.stringify(products));
        console.log("[API] Products cached successfully");
      } catch (error) {
        console.error("Redis set operation failed:", error);
        // Continue without caching - not a critical failure
      }
    }

    return NextResponse.json(products);
  } catch (error: unknown) {
    console.error("Error fetching products:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
