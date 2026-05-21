CREATE TYPE "PaymentProvider" AS ENUM ('DIRECT_WALLET', 'NOWPAYMENTS');

ALTER TABLE "Payment"
  ALTER COLUMN "provider" TYPE "PaymentProvider" USING
    CASE
      WHEN "provider" = 'NOWPAYMENTS' THEN 'NOWPAYMENTS'::"PaymentProvider"
      ELSE 'DIRECT_WALLET'::"PaymentProvider"
    END,
  ALTER COLUMN "provider" SET DEFAULT 'DIRECT_WALLET';

ALTER TABLE "Payment"
  ADD COLUMN "expectedAmount" DECIMAL(65,30),
  ADD COLUMN "destinationAddress" TEXT,
  ADD COLUMN "invoiceCode" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3);

UPDATE "Payment"
SET
  "invoiceCode" = 'LEGACY-' || "id",
  "expiresAt" = "createdAt" + interval '1 hour';

ALTER TABLE "Payment"
  ALTER COLUMN "invoiceCode" SET NOT NULL,
  ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE UNIQUE INDEX "Payment_invoiceCode_key" ON "Payment"("invoiceCode");
CREATE INDEX "Payment_invoiceCode_idx" ON "Payment"("invoiceCode");
