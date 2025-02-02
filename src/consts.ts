import type { Site, Metadata, Socials } from "@types";

export const SITE: Site = {
  NAME: "bxrne",
  EMAIL: "adamrbyrne@gmail.com",
  NUM_POSTS_ON_HOMEPAGE: 3,
  NUM_WORKS_ON_HOMEPAGE: 2,
  NUM_PROJECTS_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION:
    "I'm Adam Byrne, studying BSc+MSc ISE. I've worked in MedTech (PAS-X Deployment, MES Infrastructure and tooling), ADAS (Radar and Computer Vision) and Industrial Automation (Teleoperation, LiDAR and Infrared). Currently learning new things by building competition rockets at ULAS HiPR for MachX and EuRoC competitions. Enjoy doing hard things.",
};

export const BLOG: Metadata = {
  TITLE: "Blog",
  DESCRIPTION: "A collection of articles on topics I am passionate about.",
};

export const WORK: Metadata = {
  TITLE: "Work",
  DESCRIPTION: "Where I have worked and what I have done.",
};

export const PROJECTS: Metadata = {
  TITLE: "Projects",
  DESCRIPTION:
    "A collection of my projects, with links to repositories and demos.",
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
