CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminUser_id_check" CHECK ("id" = 1)
);

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AdminUser" FROM anon, authenticated;
GRANT ALL ON TABLE "AdminUser" TO service_role;
