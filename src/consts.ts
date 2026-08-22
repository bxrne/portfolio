import type { Site, Metadata, Socials } from "@types";

export const SITE: Site = {
	NAME: "bxrne",
	EMAIL: "adamrbyrne@gmail.com",
	NUM_POSTS_ON_HOMEPAGE: 4,
	NUM_WORKS_ON_HOMEPAGE: 4,
};

export const HOME: Metadata = {
	TITLE: "home",
	DESCRIPTION:
		"I'm Adam. I studied through ISE (MSc), a programme built around graded industry residencies, so half the degree was spent shipping real code rather than studying it. Outside of work I work on: dstest (deterministic simulation testing for Docker workloads, Lua-scripted) and tau (bitemporal database built around the idea that corrections are appends not edits, over multi-dim layers). I'm interested in deterministic simulation testing, correctness, and performance. I also contribute to Kubernetes upstream.",
};

export const BLOG: Metadata = {
	TITLE: "writing",
	DESCRIPTION: "Notes on software and its design. Human written.",
};

export const WORK: Metadata = {
	TITLE: "work",
	DESCRIPTION: "Where I have worked and what I have done.",
};

export const READING: Metadata = {
	TITLE: "reading",
	DESCRIPTION: "Books and papers I've read and recommend.",
};

export const TALKS: Metadata = {
	TITLE: "talks",
	DESCRIPTION: "Talks and presentations I've given.",
};

export const ABOUT: Metadata = {
	TITLE: "about",
	DESCRIPTION:
		"Adam Byrne is a software engineer focused on deterministic simulation testing, correctness, and low-level performance.",
};

export const CONTACT: Metadata = {
	TITLE: "contact",
	DESCRIPTION: "How to reach Adam Byrne: email and social profiles.",
};

export const PRIVACY: Metadata = {
	TITLE: "privacy",
	DESCRIPTION: "Privacy policy for bxrne.com.",
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
];
