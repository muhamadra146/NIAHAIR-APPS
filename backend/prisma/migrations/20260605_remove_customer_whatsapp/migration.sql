-- Remove whatsapp field from customers.
-- mobilePhone is the single source of truth for customer phone/WhatsApp.

ALTER TABLE "customers" DROP COLUMN "whatsapp";
