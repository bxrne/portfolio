import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { talksMarkdown } from "@lib/markdown";

export const GET: APIRoute = async () => {
  const entries = (await getCollection("talks"))
    .filter((item) => !item.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  return new Response(talksMarkdown(entries), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept, Accept-Encoding",
    },
  });
};
