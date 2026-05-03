-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "serviceArea" TEXT NOT NULL,
    "businessHours" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "feishuWebhookUrl" TEXT,
    "packagesJson" JSONB NOT NULL,
    "faqsJson" JSONB NOT NULL,
    "bookingRulesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "customerName" TEXT,
    "phone" TEXT,
    "need" TEXT NOT NULL,
    "budget" TEXT,
    "preferredTime" TEXT,
    "location" TEXT,
    "questionsJson" JSONB NOT NULL,
    "transcriptJson" JSONB NOT NULL,
    "nextAction" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "notificationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
