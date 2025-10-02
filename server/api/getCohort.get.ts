import { defineEventHandler } from "h3";
import { ofetch } from "ofetch";
import { useDrizzle } from "~~/database/client";
import { snapshots, snapshotNames } from "~~/database/schema";

export default defineEventHandler(async () => {
  const html = await ofetch<string>("https://stars.github.com/profiles/");

  const re
    = /<p[^>]*class=["'][^"']*\bstar__username\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi;

  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match.at(1);
    // Safety: strip any nested tags, collapse whitespace, trim
    const clean = raw?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (clean) names.push(clean);
  }

  const payload = {
    timestamp: new Date().toISOString(),
    count: names.length,
    names,
  };

  const db = useDrizzle();
  // Insert into DB
  const snapshotId = await db.transaction(async (tx) => {
    const [snap] = await tx
      .insert(snapshots)
      .values({
        count: payload.count,
      })
      .returning();

    if (!snap) throw new Error("Failed to insert snapshot");

    await tx.insert(snapshotNames).values(
      payload.names.map((name, i) => ({
        snapshotId: snap.id,
        name,
        position: i,
        createdAt: payload.timestamp,
      })),
    );

    return snap.id;
  });

  return {
    snapshotId,
    ...payload,
  };
});
