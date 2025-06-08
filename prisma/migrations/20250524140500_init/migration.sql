-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'CREATOR', 'ADMIN', 'GUEST');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "picture" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';
