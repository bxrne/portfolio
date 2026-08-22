import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { workMarkdown } from "@lib/markdown";

export const GET: APIRoute = async () => {
  const entries = (await getCollection("work")).sort(
    (a, b) => b.data.dateStart.valueOf() - a.data.dateStart.valueOf()
  );
  return new Response(workMarkdown(entries), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept, Accept-Encoding",
    },
  });
};
