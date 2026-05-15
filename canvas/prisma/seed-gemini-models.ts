import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

const geminiModels = [
  {
    displayName: "Google Nano Banana",
    provider: "google",
    modelId: "gemini-2.5-flash-image",
    endpointType: "gemini_generate_content",
    billingType: "per_request",
    platformCost: 0.09,
    userCreditCost: 0.07,
    sortOrder: 20,
    concurrencyLimit: 3,
    timeoutSeconds: 120,
  },
  {
    displayName: "Google Nano Banana 2",
    provider: "google",
    modelId: "gemini-3.1-flash-image-preview",
    endpointType: "gemini_generate_content",
    billingType: "per_request",
    platformCost: 0.248,
    userCreditCost: 0.15,
    sortOrder: 30,
    concurrencyLimit: 3,
    timeoutSeconds: 120,
  },
  {
    displayName: "Google Nano Banana Pro",
    provider: "google",
    modelId: "gemini-3-pro-image-preview",
    endpointType: "gemini_generate_content",
    billingType: "per_request",
    platformCost: 0.495,
    userCreditCost: 0.3,
    sortOrder: 40,
    concurrencyLimit: 2,
    timeoutSeconds: 180,
  },
];

async function main() {
  console.log("Seeding Gemini models...");

  for (const model of geminiModels) {
    console.log(`Upserting ${model.displayName}...`);
    await prisma.modelConfig.upsert({
      where: { modelId: model.modelId },
      create: {
        displayName: model.displayName,
        provider: model.provider,
        modelId: model.modelId,
        endpointType: model.endpointType,
        billingType: model.billingType,
        platformCost: model.platformCost,
        userCreditCost: model.userCreditCost,
        sortOrder: model.sortOrder,
        concurrencyLimit: model.concurrencyLimit,
        timeoutSeconds: model.timeoutSeconds,
        enabled: true,
        userSelectable: true,
      },
      update: {
        displayName: model.displayName,
        provider: model.provider,
        endpointType: model.endpointType,
        billingType: model.billingType,
        platformCost: model.platformCost,
        userCreditCost: model.userCreditCost,
        sortOrder: model.sortOrder,
        concurrencyLimit: model.concurrencyLimit,
        timeoutSeconds: model.timeoutSeconds,
        enabled: true,
        userSelectable: true,
      },
    });
  }

  console.log("Gemini models seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
