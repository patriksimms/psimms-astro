import { getCollection, type CollectionEntry } from "astro:content";

export type Reading = CollectionEntry<"readings">;

export const READING_LIST_PATH = "/posts/engineering/recommended-reading/";
export const READING_LIST_TITLE = "Recommended reading on agentic engineering";

export function isPublishedReading(reading: Reading): boolean {
  const comment = reading.data.comment.trim();
  return comment !== "" && !comment.toUpperCase().startsWith("TODO");
}

export async function getReadings(): Promise<Reading[]> {
  const readings = await getCollection("readings");
  return readings.sort(
    (a, b) => b.data.readDate.valueOf() - a.data.readDate.valueOf(),
  );
}

export async function getPublishedReadings(): Promise<Reading[]> {
  return (await getReadings()).filter(isPublishedReading);
}

export function youtubeVideoId(url: string): string | undefined {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return parsed.pathname.slice(1) || undefined;
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch")
      return parsed.searchParams.get("v") ?? undefined;
    const shortForm = parsed.pathname.match(
      /^\/(?:embed|shorts|live)\/([\w-]+)/,
    );
    if (shortForm) return shortForm[1];
  }
  return undefined;
}

export function readingDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
