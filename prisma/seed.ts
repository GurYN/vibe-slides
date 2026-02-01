import "dotenv/config";
import prisma from "../lib/prisma";
import { builtInTemplates } from "../data/templates";

async function main() {
  console.log("Seeding database with built-in templates...");

  for (const template of builtInTemplates) {
    const existing = await prisma.template.findUnique({
      where: { id: template.id },
    });

    if (existing) {
      console.log(`Template "${template.name}" already exists, updating...`);
      await prisma.template.update({
        where: { id: template.id },
        data: {
          name: template.name,
          category: template.category,
          previewImage: template.previewImage,
          designSystem: JSON.stringify(template.designSystem),
          styleReference: template.styleReference,
          isBuiltIn: template.isBuiltIn,
        },
      });
    } else {
      console.log(`Creating template "${template.name}"...`);
      await prisma.template.create({
        data: {
          id: template.id,
          name: template.name,
          category: template.category,
          previewImage: template.previewImage,
          designSystem: JSON.stringify(template.designSystem),
          styleReference: template.styleReference,
          isBuiltIn: template.isBuiltIn,
        },
      });
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
