import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// GET - Fetch all products
export async function GET() {
  try {
    let cachedProducts: string | null = null;

    if (redis) {
      cachedProducts = await redis.get("products:all");
    }

    if (cachedProducts) {
      console.log("[v0] Returning products from Redis cache");
      return NextResponse.json(JSON.parse(cachedProducts));
    }

    console.log("[v0] Fetching products from database");
    const products = await prisma.product.findMany();

    if (redis) {
      await redis.setex("products:all", 600, JSON.stringify(products));
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

    if (redis) {
      await redis.del("products:all");
      console.log("[v0] Invalidated cache for products list after create");
    }

    return NextResponse.json(newProduct);
  } catch (error: unknown) {
    console.error("Error creating product:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
