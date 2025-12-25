-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('kakao', 'google');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "social_id" TEXT NOT NULL,
    "auth_provider" "AuthProvider" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_social_id_auth_provider_key" ON "users"("social_id", "auth_provider");
