CREATE TABLE "developper" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"githubId" integer NOT NULL,
	"avatarUrl" text NOT NULL,
	"bio" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	CONSTRAINT "developper_githubId_unique" UNIQUE("githubId")
);
