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
    "I'm Adam Byrne, studying BSc+MSc ISE. I've worked in MedTech (PAS-X Deployment, MES Infrastructure and tooling), ADAS (Radar and Computer Vision) and Industrial Automation (Teleoperation, LiDAR and Infrared), AI and Cloud Infrastructure Automation for Investment Funds analysis. Built & Flown competition rockets at ULAS HiPR for MachX (2nd in 2025) and EuRoC competitions (5th in Payload). Enjoy doing hard things.",
};

export const BLOG: Metadata = {
  TITLE: "blog",
  DESCRIPTION: "A collection of articles on topics I am passionate about.",
};

export const WORK: Metadata = {
  TITLE: "work",
  DESCRIPTION: "Where I have worked and what I have done.",
};

export const PROJECTS: Metadata = {
  TITLE: "projects",
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
