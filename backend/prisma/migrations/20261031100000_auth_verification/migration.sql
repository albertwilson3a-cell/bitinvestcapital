-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_login_at" TIMESTAMPTZ(6),
ADD COLUMN     "verification_token_expires_at" TIMESTAMPTZ(6),
ADD COLUMN     "verified_at" TIMESTAMPTZ(6),
ALTER COLUMN "verification_token" SET DATA TYPE CHAR(64);
