import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  if (id === null)
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
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
  if (id === null)
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

  const body = (await request.json()) as {
    name?: string;
    price?: number | string;
    description?: string;
  };
  const { name, price, description } = body;

  if (!name || !price || !description)
    return NextResponse.json(
      { error: "Name, price, and description are required" },
      { status: 400 }
    );

  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        price: Number(price),
        description,
      },
    });
    return NextResponse.json(updatedProduct);
  } catch (error: unknown) {
    console.error("Error updating product:", getErrorMessage(error));
    if ((error as { code?: string }).code === "P2025")
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  const id = extractId(request);
  if (id === null)
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

  try {
    const deletedProduct = await prisma.product.delete({ where: { id } });
    return NextResponse.json(deletedProduct);
  } catch (error: unknown) {
    console.error("Error deleting product:", getErrorMessage(error));
    if ((error as { code?: string }).code === "P2025")
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
