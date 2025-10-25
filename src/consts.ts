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
    "Interested in software and distributed systems. I’ve worked in MedTech developing MES integrations and observability tooling for factory automation, built AI analysis platforms for investment fund software, and worked on radar vision ML in ADAS projects. In robotics, I developed teleoperation tools and simulation environments for industrial arms and created performance benchmarks for computer vision models. I’ve led payloads for competition rockets, including deployable CanSats running edge AI and real-time telemetry. Mainly Go, Typescript, Python, Bash, C, C++, and Lua, via Kubernetes, Helm, Linux, and Terraform. I’m currently learning OCaml...",
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
