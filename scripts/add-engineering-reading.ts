#!/usr/bin/env bun
/**
 * Scaffold a new entry for the "Recommended reading on agentic engineering" page.
 *
 * Usage:
 *   bun run add-reading <url> [--date YYYY-MM-DD] [--type article|video|paper|podcast]
 *
 * Fetches the page once, extracts Open Graph metadata (title, description,
 * site name, preview image), downloads the preview image next to the entry,
 * and writes src/content/readings/<slug>.json with a TODO comment.
 * The entry stays a draft (hidden from the live page and RSS) until the
 * TODO comment is replaced.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const READINGS_DIR = join(SCRIPT_DIR, "..", "src", "content", "readings");
const IMAGES_DIR = join(READINGS_DIR, "_images");
const TYPES = ["article", "video", "paper", "podcast"] as const;
type ReadingType = (typeof TYPES)[number];

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

// --- argument parsing -------------------------------------------------------

const args = process.argv.slice(2);
let url: string | undefined;
let dateArg: string | undefined;
let typeArg: ReadingType | undefined;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--date") dateArg = args[++i];
  else if (arg === "--type") typeArg = args[++i] as ReadingType;
  else if (arg === "--help" || arg === "-h") {
    console.log(
      "Usage: bun run add-reading <url> [--date YYYY-MM-DD] [--type article|video|paper|podcast]",
    );
    process.exit(0);
  } else if (!url) url = arg;
  else fail(`Unexpected argument: ${arg}`);
}

if (!url) fail("Missing URL. Usage: bun run add-reading <url>");
let target: URL;
try {
  target = new URL(url);
} catch {
  fail(`Not a valid URL: ${url}`);
}
if (dateArg && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  fail(`--date must be YYYY-MM-DD, got: ${dateArg}`);
}
if (typeArg && !TYPES.includes(typeArg)) {
  fail(`--type must be one of ${TYPES.join(", ")}, got: ${typeArg}`);
}

// --- metadata extraction ----------------------------------------------------

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const tag of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const attr of tag[0].matchAll(
      /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    )) {
      attrs[attr[1].toLowerCase()] = attr[2] ?? attr[3] ?? "";
    }
    const key = (attrs.property ?? attrs.name)?.toLowerCase();
    if (key && attrs.content && !(key in meta)) {
      meta[key] = decodeEntities(attrs.content.trim());
    }
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) meta["html:title"] = decodeEntities(title[1].trim());
  return meta;
}

function inferType(pageUrl: URL): ReadingType {
  const host = pageUrl.hostname.replace(/^www\./, "");
  if (["youtube.com", "youtu.be", "m.youtube.com", "vimeo.com"].includes(host))
    return "video";
  if (host === "arxiv.org") return "paper";
  if (
    host === "podcasts.apple.com" ||
    (host === "open.spotify.com" && pageUrl.pathname.startsWith("/episode"))
  )
    return "podcast";
  return "article";
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
  return slug || "reading";
}

console.log(`→ Fetching ${target.href}`);
const response = await fetch(target.href, {
  headers: {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml",
  },
  redirect: "follow",
});
if (!response.ok) fail(`Fetch failed: HTTP ${response.status}`);
const html = await response.text();
const meta = extractMeta(html);

const title = meta["og:title"] ?? meta["twitter:title"] ?? meta["html:title"];
if (!title) fail("Could not extract a title from the page.");
const description =
  meta["og:description"] ?? meta["twitter:description"] ?? meta["description"];
const siteName = meta["og:site_name"];
const imageUrl = meta["og:image"] ?? meta["twitter:image"];

// --- slug + image download --------------------------------------------------

mkdirSync(READINGS_DIR, { recursive: true });
let slug = slugify(title);
for (let n = 2; existsSync(join(READINGS_DIR, `${slug}.json`)); n++) {
  slug = `${slugify(title)}-${n}`;
}

let imagePath: string | undefined;
if (imageUrl) {
  try {
    const resolved = new URL(imageUrl, target.href);
    const imageResponse = await fetch(resolved.href, {
      headers: { "user-agent": "Mozilla/5.0" },
      redirect: "follow",
    });
    const contentType = imageResponse.headers.get("content-type") ?? "";
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    }[contentType.split(";")[0].trim()];
    if (imageResponse.ok && ext) {
      mkdirSync(IMAGES_DIR, { recursive: true });
      const buffer = new Uint8Array(await imageResponse.arrayBuffer());
      writeFileSync(join(IMAGES_DIR, `${slug}.${ext}`), buffer);
      imagePath = `./_images/${slug}.${ext}`;
      console.log(`→ Saved preview image (${contentType.split(";")[0]})`);
    } else {
      console.warn(
        `⚠ Skipping preview image (status ${imageResponse.status}, content-type "${contentType}")`,
      );
    }
  } catch (error) {
    console.warn(`⚠ Skipping preview image: ${error}`);
  }
}

// --- write entry --------------------------------------------------------------

const today = new Date();
const readDate =
  dateArg ??
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const entry = {
  url: target.href,
  title,
  ...(description ? { description } : {}),
  ...(siteName ? { siteName } : {}),
  ...(imagePath ? { image: imagePath } : {}),
  type: typeArg ?? inferType(target),
  readDate,
  comment: "TODO: add your comment",
};

const entryPath = join(READINGS_DIR, `${slug}.json`);
writeFileSync(entryPath, `${JSON.stringify(entry, null, 2)}\n`);

console.log(`\n✔ Created src/content/readings/${slug}.json`);
console.log(`  title: ${title}`);
console.log(`  type:  ${entry.type} · read: ${readDate}`);
console.log(
  `\nNext: replace the TODO comment in that file — the entry stays hidden from the page and RSS until you do.`,
);
