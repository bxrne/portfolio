import type { APIRoute } from "astro";
import { CONTACT, SITE, SOCIALS } from "@consts";

export const GET: APIRoute = () =>
  new Response(
    [
      "# contact",
      "",
      `> ${CONTACT.DESCRIPTION}`,
      "",
      `The fastest way to reach me is email at ${SITE.EMAIL}. I read everything sent to that address and reply to anything concrete: a question about a post, a bug report against one of my projects, a consulting or collaboration enquiry, or a correction I should publish.`,
      "",
      "For recruiting and contract work, include the role, the team, and the stack in your first message. Messages without enough context to judge fit tend to stall.",
      "",
      "Profiles:",
      "",
      ...SOCIALS.map((social) => `- ${social.NAME}: ${social.HREF}`),
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept, Accept-Encoding",
      },
    }
  );
