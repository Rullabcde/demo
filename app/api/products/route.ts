import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeRedisOperation } from "@/lib/redis";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// GET - Fetch all products
export async function GET() {
  try {
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
