import type { APIRoute } from "astro";
import { getBlogPosts, postMarkdown } from "@lib/markdown";

export async function getStaticPaths() {
  return (await getBlogPosts()).map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

type Props = {
  post: Awaited<ReturnType<typeof getBlogPosts>>[number];
};

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as Props;
  return new Response(postMarkdown(post), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept, Accept-Encoding",
    },
  });
};
