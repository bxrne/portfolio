import type { APIRoute } from "astro";
import { llmsTxt, getBlogPosts } from "@lib/markdown";

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts();
  return new Response(llmsTxt(posts), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Vary": "Accept, Accept-Encoding",
    },
  });
};