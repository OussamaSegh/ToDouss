const MENTION_MARKDOWN = /@\[[^\]]+\]\(([^)]+)\)/g;
const MENTION_TOKEN = /@([a-z0-9]{10,})/gi;

export function parseMentionUserIdsFromBody(body: string): string[] {
  const ids = new Set<string>();

  for (const match of body.matchAll(MENTION_MARKDOWN)) {
    const id = match[1]?.trim();
    if (id) ids.add(id);
  }

  // Fallback token format, useful for plain-text editor states.
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const id = match[1]?.trim();
    if (id) ids.add(id);
  }

  return [...ids];
}
