-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "deviceInfo" JSONB,
ADD COLUMN     "ipAddress" TEXT NOT NULL DEFAULT '0.0.0.0',
ADD COLUMN     "isTrusted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "notificationPrefs" JSONB,
ADD COLUMN     "phone" TEXT;
