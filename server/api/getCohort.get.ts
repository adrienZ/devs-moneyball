import { defineEventHandler } from "h3";
import { ofetch } from "ofetch";
import { SnapshotRepository } from "~~/server/repositories/snapshotRepository";

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

  const snapshotRepository = SnapshotRepository.getInstance();
  const snapshotId = await snapshotRepository.createSnapshotWithNames({
    count: payload.count,
    names: payload.names,
    timestamp: payload.timestamp,
  });

  return {
    snapshotId,
    ...payload,
  };
});
