import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/posts/` directory.
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: image().optional(),
      tags: z.array(z.enum(["engineering", "games", "other"])),
    }),
});

const readings = defineCollection({
  loader: glob({ pattern: "*.json", base: "src/content/readings" }),
  schema: ({ image }) =>
    z.object({
      url: z.url(),
      title: z.string(),
      description: z.string().optional(),
      siteName: z.string().optional(),
      image: image().optional(),
      type: z.enum(["article", "video", "paper", "podcast"]).default("article"),
      readDate: z.coerce.date(),
      // Entries whose comment is empty or still starts with "TODO" are
      // treated as drafts: hidden from the published page and the RSS feed.
      comment: z.string(),
    }),
});

export const collections = { blog, readings };
