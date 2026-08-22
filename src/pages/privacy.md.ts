import type { APIRoute } from "astro";
import { PRIVACY, HOME } from "@consts";

export const GET: APIRoute = () =>
  new Response(
    [
      "# privacy",
      "",
      `> ${PRIVACY.DESCRIPTION}`,
      "",
      "This site is a static website. It is plain HTML, CSS, and a small amount of client-side script for navigation and layout. It does not run advertising, and it does not sell or share any information about its visitors.",
      "",
      "No analytics or tracking scripts are embedded in these pages. The hosting provider (Cloudflare) processes standard request metadata such as IP address, user agent, and requested URL for security and delivery purposes. That processing is governed by Cloudflare's own privacy policy, not by this site. The site operator does not build visitor profiles from that data.",
      "",
      "The site sets no cookies and uses no browser storage for tracking. External links, for example to GitHub or LinkedIn, lead to third-party sites with their own privacy practices; this policy does not cover them.",
      "",
      "If you email the address listed on the contact page, the message is retained only as long as needed to answer it. If you want a correction to published content, send it by email and it will be reviewed.",
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept, Accept-Encoding",
      },
    }
  );