import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      {
        name: "Laptop ASUS TUF",
        price: 12000000,
        description: "Laptop gaming dengan Intel i5 dan RTX 3050",
      },
      {
        name: "Keyboard Mechanical",
        price: 750000,
        description: "Keyboard mechanical switch biru dengan RGB",
      },
      {
        name: "Monitor 24 inch",
        price: 1800000,
        description: "Monitor full HD IPS 144Hz cocok buat gaming & kerja",
      },
      {
        name: "Mouse Wireless",
        price: 250000,
        description: "Mouse wireless ergonomis dengan baterai tahan lama",
      },
      {
        name: "Headset Gaming",
        price: 550000,
        description: "Headset surround sound 7.1 dengan mic noise-cancelling",
      },
    ],
  });

  console.log("Seed data berhasil dimasukkan!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
