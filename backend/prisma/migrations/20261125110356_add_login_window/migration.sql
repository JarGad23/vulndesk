-- CreateTable
CREATE TABLE "LoginWindow" (
    "ip" TEXT NOT NULL,
    "windowStart" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL,

    CONSTRAINT "LoginWindow_pkey" PRIMARY KEY ("ip")
);
