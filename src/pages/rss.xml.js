import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import {
  getPublishedReadings,
  READING_LIST_PATH,
  READING_LIST_TITLE,
} from "../lib/readings";

export async function GET(context) {
  const posts = await getCollection("blog");
  const postItems = posts.map((post) => ({
    ...post.data,
    link: `/posts/${post.id}/`,
  }));

  const readingItems = (await getPublishedReadings()).map((reading) => ({
    title: `${READING_LIST_TITLE}: ${reading.data.title}`,
    description: reading.data.comment,
    pubDate: reading.data.readDate,
    // Absolute URL on purpose: @astrojs/rss appends a trailing slash to
    // relative links, which would corrupt the #fragment. Absolute URLs
    // pass through untouched.
    link: new URL(`${READING_LIST_PATH}#${reading.id}`, context.site).href,
    categories: ["recommended-reading"],
  }));

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: [...postItems, ...readingItems].sort(
      (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf(),
    ),
  });
}
