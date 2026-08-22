import type { APIRoute } from "astro";
import { ABOUT } from "@consts";

export const GET: APIRoute = () =>
  new Response(
    [
      "# about",
      "",
      `> ${ABOUT.DESCRIPTION}`,
      "",
      "I am Adam Byrne, a software engineer working on deterministic simulation testing, correctness, and low-level performance. This site is my portfolio: it collects the placements I have worked, the things I have written, talks I have given, and a reading list of books and papers I recommend.",
      "",
      "I studied through ISE (MSc), a programme built around graded industry residencies, so half the degree was spent shipping real code rather than studying it. That path took me through regulated medical device software, industrial inspection, and desktop application work before I specialised in infrastructure.",
      "",
      "Outside of employment I maintain dstest, deterministic simulation testing for Docker workloads scripted in Lua, and tau, a bitemporal database built around the idea that corrections are appends not edits over multi-dimensional layers. I also contribute to Kubernetes upstream.",
      "",
    ].join("\n"),
    {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Vary": "Accept, Accept-Encoding",
      },
    }
  );
