import { defineEventHandler } from "h3";
import { ofetch } from "ofetch";

const usernameRe
  = /<(?:p|h4)[^>]*class=["'][^"']*\b(?:star__username|star__name)\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|h4)>/gi;

export function parseUsernamesFromHtml(html: string): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = usernameRe.exec(html)) !== null) {
    const raw = match.at(1);
    // Safety: strip any nested tags, collapse whitespace, trim
    const clean = raw?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    if (clean) names.push(clean);
  }
  return names;
}

export function mergeGithubStarsNames(profilesHtml: string, alumniHtml: string): string[] {
  return [
    ...parseUsernamesFromHtml(profilesHtml),
    ...parseUsernamesFromHtml(alumniHtml),
  ];
}

export default defineEventHandler(async () => {
  const profilesHtml = await ofetch<string>("https://stars.github.com/profiles/");
  const alumniHtml = await ofetch<string>("https://stars.github.com/alumni/");
  const names = mergeGithubStarsNames(profilesHtml, alumniHtml);

  const payload = {
    timestamp: new Date().toISOString(),
    count: names.length,
    names,
  };

  return {
    ...payload,
  };
});
