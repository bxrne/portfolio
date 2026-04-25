import type { Site, Metadata, Socials } from "@types";

export const SITE: Site = {
  NAME: "Adam Byrne",
  EMAIL: "adamrbyrne@gmail.com",
  NUM_POSTS_ON_HOMEPAGE: 4,
  NUM_WORKS_ON_HOMEPAGE: 4,
};

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION:
    "Interested in software and systems programming. Currently looking at distributed systems and some systems programming. Wrote perception software for car radar systems, worked on factory teleop and simulation, worked on platforms for ai investment research and medtech. Also worked on simulation and payload for high-powered rocketry.",
};

export const BLOG: Metadata = {
  TITLE: "Writing",
  DESCRIPTION: "Notes on software and its design. Human written.",
};

export const WORK: Metadata = {
  TITLE: "Work",
  DESCRIPTION: "Where I have worked and what I have done.",
};

export const READING: Metadata = {
  TITLE: "Reading",
  DESCRIPTION: "Books and papers I've read and recommend.",
};

export const SOCIALS: Socials = [
  {
    NAME: "GitHub",
    HREF: "https://github.com/bxrne",
  },
  {
    NAME: "LinkedIn",
    HREF: "https://www.linkedin.com/in/bxrne",
  },
  {
    NAME: "Twitter",
    HREF: "https://twitter.com/abxrne",
  },
  {
    NAME: "Substack",
    HREF: "https://substack.com/@bxrne",
  },
];
