import type { APIRoute } from "astro";
import { blogIndexMarkdown, getBlogPosts } from "@lib/markdown";

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts();
  return new Response(blogIndexMarkdown(posts), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept, Accept-Encoding",
    },
  });
};
