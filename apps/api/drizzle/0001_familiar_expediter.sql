UPDATE "tutores" SET "telefone" = '0000000000' WHERE "telefone" IS NULL;--> statement-breakpoint
ALTER TABLE "tutores" ALTER COLUMN "telefone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tutores" ADD COLUMN "pin_acesso" text;--> statement-breakpoint
UPDATE "tutores" SET "pin_acesso" = substr(md5(random()::text || id::text), 1, 8) WHERE "pin_acesso" IS NULL;--> statement-breakpoint
ALTER TABLE "tutores" ALTER COLUMN "pin_acesso" SET NOT NULL;
