import type { APIRoute } from "astro";
import { getBlogPosts, homeMarkdown } from "@lib/markdown";

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts();
  return new Response(homeMarkdown(posts), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept, Accept-Encoding",
    },
  });
};
