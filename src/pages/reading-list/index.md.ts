import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readingMarkdown } from "@lib/markdown";

export const GET: APIRoute = async () => {
  const entries = (await getCollection("reading"))
    .filter((item) => !item.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return new Response(readingMarkdown(entries), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept, Accept-Encoding",
    },
  });
};
