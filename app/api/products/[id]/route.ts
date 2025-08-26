// app/api/products/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, safeRedisOperation } from "@/lib/redis";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function extractId(request: NextRequest): number | null {
  const parts = request.nextUrl.pathname.split("/");
  const idStr = parts[parts.length - 1];
  const id = Number(idStr);
  return isNaN(id) ? null : id;
}

// GET - Fetch single product
export async function GET(request: NextRequest) {
  const id = extractId(request);
  if (id === null) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const cacheKey = `product:${id}`;

    // Try to get from cache safely
    const cachedProduct = await safeRedisOperation(async (client) => {
      const data = await client.get(cacheKey);
      return data;
    }, null);

    if (cachedProduct) {
      console.log(`[API] Returning product ${id} from Redis cache`);
      return NextResponse.json(JSON.parse(cachedProduct));
    }

    console.log(`[API] Fetching product ${id} from database`);
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Cache the result safely
    await safeRedisOperation(async (client) => {
      await client.setex(cacheKey, 600, JSON.stringify(product));
      console.log(`[API] Product ${id} cached successfully`);
      return true;
    }, false);

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Error fetching product:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  const id = extractId(request);
  if (id === null) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        description,
      },
    });

    // Invalidate cache safely
    await safeRedisOperation(async (client) => {
      await client.del(`product:${id}`, "products:all");
      console.log(
        `[API] Invalidated cache for product ${id} and products list after update`
      );
      return true;
    }, false);

    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
    console.error("Error updating product:", getErrorMessage(error));

    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  const id = extractId(request);
  if (id === null) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const deletedProduct = await prisma.product.delete({ where: { id } });

    // Invalidate cache safely
    await safeRedisOperation(async (client) => {
      await client.del(`product:${id}`, "products:all");
      console.log(
        `[API] Invalidated cache for product ${id} and products list after deletion`
      );
      return true;
    }, false);

    return NextResponse.json(deletedProduct);
  } catch (error: unknown) {
    console.error("Error deleting product:", getErrorMessage(error));

    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

// ALTERNATIVE: Direct safe approach (if you prefer not using helper function)
export async function GET_ALTERNATIVE(request: NextRequest) {
  const id = extractId(request);
  if (id === null) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const cacheKey = `product:${id}`;
    let cachedProduct: string | null = null;

    // Safe Redis get operation
    if (redis) {
      try {
        cachedProduct = await redis.get(cacheKey);
      } catch (error) {
        console.error(`Redis get operation failed for product ${id}:`, error);
        cachedProduct = null;
      }
    }

    if (cachedProduct) {
      console.log(`[API] Returning product ${id} from Redis cache`);
      return NextResponse.json(JSON.parse(cachedProduct));
    }

    console.log(`[API] Fetching product ${id} from database`);
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Safe Redis set operation
    if (redis) {
      try {
        await redis.setex(cacheKey, 600, JSON.stringify(product));
        console.log(`[API] Product ${id} cached successfully`);
      } catch (error) {
        console.error(`Redis set operation failed for product ${id}:`, error);
        // Continue without caching - not a critical failure
      }
    }

    return NextResponse.json(product);
  } catch (error: unknown) {
    console.error("Error fetching product:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT_ALTERNATIVE(request: NextRequest) {
  const id = extractId(request);
  if (id === null) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

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

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        description,
      },
    });

    // Safe Redis delete operation
    if (redis) {
      try {
        await redis.del(`product:${id}`, "products:all");
        console.log(
          `[API] Invalidated cache for product ${id} and products list after update`
        );
      } catch (error) {
        console.error(
          `Redis delete operation failed for product ${id}:`,
          error
        );
        // Continue - cache invalidation failure is not critical
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
    console.error("Error updating product:", getErrorMessage(error));

    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE_ALTERNATIVE(request: NextRequest) {
  const id = extractId(request);
  if (id === null) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  try {
    const deletedProduct = await prisma.product.delete({ where: { id } });

    // Safe Redis delete operation
    if (redis) {
      try {
        await redis.del(`product:${id}`, "products:all");
        console.log(
          `[API] Invalidated cache for product ${id} and products list after deletion`
        );
      } catch (error) {
        console.error(
          `Redis delete operation failed for product ${id}:`,
          error
        );
        // Continue - cache invalidation failure is not critical
      }
    }

    return NextResponse.json(deletedProduct);
  } catch (error: unknown) {
    console.error("Error deleting product:", getErrorMessage(error));

    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
