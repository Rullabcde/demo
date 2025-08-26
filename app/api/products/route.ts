import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"

// GET - Fetch all products
export async function GET() {
  try {
    const cachedProducts = await redis.get("products:all")
    if (cachedProducts) {
      console.log("[v0] Returning products from Redis cache")
      return NextResponse.json(JSON.parse(cachedProducts))
    }

    console.log("[v0] Fetching products from database")
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    })

    await redis.setex("products:all", 300, JSON.stringify(products))

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, price, description } = body

    if (!name || !price || !description) {
      return NextResponse.json({ error: "Name, price, and description are required" }, { status: 400 })
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        price: Number.parseFloat(price),
        description,
      },
    })

    await redis.del("products:all")
    console.log("[v0] Invalidated products cache after creation")

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
  }
}
