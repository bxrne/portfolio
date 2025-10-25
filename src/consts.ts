import type { Site, Metadata, Socials } from "@types";

export const SITE: Site = {
  NAME: "[bxrne]",
  EMAIL: "adamrbyrne@gmail.com",
  NUM_POSTS_ON_HOMEPAGE: 4,
  NUM_WORKS_ON_HOMEPAGE: 4,
  NUM_PROJECTS_ON_HOMEPAGE: 4,
};

export const HOME: Metadata = {
  TITLE: "home",
  DESCRIPTION:
    "I'm Adam Byrne, in final year of MSc [ISE] at UL. In my residencies I worked on robotic teleoperation, radar vision systems, manufacturing execution platforms and investment fund analytics software. Flew and wrote code for competition rockets with AI vision systems. I mainly write Go for projects and packages, experienced in C/C++, Python, Web and IaaC. Learning OCaml currently...",
};

export const BLOG: Metadata = {
  TITLE: "blog",
  DESCRIPTION: "A collection of thoughts and ideas on software",
};

export const WORK: Metadata = {
  TITLE: "work",
  DESCRIPTION: "Where I have worked and what I have done. The residencies are graded semester placements during my integrated MSc.",
};

export const PROJECTS: Metadata = {
  TITLE: "projects",
  DESCRIPTION:
    "A collection of my projects, with links to repositories and demos",
};

export const SOCIALS: Socials = [
  {
    NAME: "twitter-x",
    HREF: "https://twitter.com/abxrne",
  },
  {
    NAME: "github",
    HREF: "https://github.com/bxrne",
  },
  {
    NAME: "notion",
    HREF: "https://notion.so/@bxrne",
  },
  {
    NAME: "linkedin",
    HREF: "https://www.linkedin.com/in/bxrne",
  },
];
