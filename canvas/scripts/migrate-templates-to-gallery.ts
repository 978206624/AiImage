import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { probeImageDimensions } from "../src/lib/image-dimensions";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const DEFAULT_MODEL_TAG = "GPT-4o Image";
const DEFAULT_STYLE_TAG = "通用";

async function main() {
  console.log(`[migrate] mode = ${dryRun ? "DRY-RUN" : "LIVE"}`);

  const templates = await prisma.promptTemplate.findMany({
    orderBy: { id: "asc" },
  });
  console.log(`[migrate] scanned ${templates.length} templates`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const tpl of templates) {
    const imageUrl = tpl.coverImageUrl;
    if (!imageUrl) {
      console.warn(`  skip id=${tpl.id} (no cover image)`);
      skipped++;
      continue;
    }

    const existing = await prisma.galleryImage.findFirst({
      where: { imageUrl },
      select: { id: true },
    });
    if (existing) {
      console.log(`  skip id=${tpl.id} (already in gallery as #${existing.id})`);
      skipped++;
      continue;
    }

    const dims = await probeImageDimensions(imageUrl);

    const data = {
      imageUrl,
      prompt: tpl.prompt,
      modelTag: DEFAULT_MODEL_TAG,
      styleTag: DEFAULT_STYLE_TAG,
      title: tpl.name,
      categoryId: tpl.categoryId,
      width: dims?.width,
      height: dims?.height,
      isFeatured: false,
      isPublished: true,
      sortOrder: tpl.sortOrder,
      createdAt: tpl.createdAt,
    };

    if (dryRun) {
      console.log(
        `  would insert id=${tpl.id} title="${tpl.name}" cat=${tpl.categoryId} dims=${dims ? `${dims.width}x${dims.height}` : "null"}`
      );
      migrated++;
      continue;
    }

    try {
      const created = await prisma.galleryImage.create({ data });
      console.log(
        `  ok id=${tpl.id} -> gallery #${created.id} title="${tpl.name}"`
      );
      migrated++;
    } catch (err) {
      console.error(`  fail id=${tpl.id}`, err);
      failed++;
    }
  }

  console.log(
    `[migrate] done. scanned=${templates.length} migrated=${migrated} skipped=${skipped} failed=${failed}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
