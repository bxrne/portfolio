import { mergeVary, preferredType } from "./accept.js";

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const acceptHeader = request.headers.get("accept");

    const prefersMarkdown =
      preferredType(acceptHeader, ["text/markdown", "text/html"]) ===
      "text/markdown";

    // Normalise path: strip trailing slash except for root
    let path = url.pathname;
    if (path !== "/" && path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    // Attempt markdown mirror: try appending .md
    let response: Response | null = null;
    if (prefersMarkdown && !path.endsWith(".md")) {
      const mirrorPath = path === "" ? "/index.md" : `${path}.md`;
      const mdRequest = new Request(
        new URL(mirrorPath, import.meta.env.SITE ?? "https://bxrne.com"),
        {
          headers: {
            accept: "text/markdown",
            ...Object.fromEntries(request.headers.entries()),
          },
        }
      );
      const mdRes = await env.ASSETS.fetch(mdRequest);
      if (mdRes.status === 200) {
        const ct = mdRes.headers.get("content-type") ?? "";
        if (ct.includes("text/markdown")) {
          response = mdRes;
        }
      }
    }

    // Fallback: serve original request
    let finalRes = response ?? await env.ASSETS.fetch(request);

    // Append Vary: Accept, Accept-Encoding
    finalRes = mergeVary(finalRes);

    return finalRes;
  },
};