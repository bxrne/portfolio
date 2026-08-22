import type { APIRoute } from "astro";
import { HOME } from "@consts";

export const GET: APIRoute = () =>
  new Response(
    [
      "# resume",
      "",
      `> ${HOME.DESCRIPTION}`,
      "",
      "The full CV is available as a PDF at /resume.pdf.",
      "",
      "A structured summary of employment history lives at /work.md.",
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept, Accept-Encoding",
      },
    }
  );
