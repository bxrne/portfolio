export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const upstream = await env.ASSETS.fetch(request);

    const existingVary = upstream.headers.get("Vary") ?? "";
    const tokens = new Set(
      existingVary
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    tokens.add("accept");
    tokens.add("accept-encoding");

    const headers = new Headers(upstream.headers);
    headers.set("Vary", Array.from(tokens).join(", "));

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  },
};