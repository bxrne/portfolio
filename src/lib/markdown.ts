import { getCollection, type CollectionEntry } from "astro:content";
import { SITE, HOME } from "@consts";

type BlogPost = CollectionEntry<"blog">;

export async function getBlogPosts(): Promise<BlogPost[]> {
	return (await getCollection("blog"))
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

function page(title: string, href: string): string {
	return `- [${title}](${new URL(href, import.meta.env.SITE).href})`;
}

export function homeMarkdown(posts: BlogPost[]): string {
	return [
		`# ${SITE.NAME}`,
		"",
		`> ${HOME.DESCRIPTION}`,
		"",
		"Adam Byrne is a software engineer focused on deterministic simulation testing, correctness, and low-level performance. He completed an MSc through ISE, a programme built around graded industry residencies shipping production software.",
		"",
		"## Recent writing",
		"",
		...posts.map((post) => `- [${post.data.title}](${new URL(`/blog/${post.slug}.md`, import.meta.env.SITE).href}): ${post.data.description}`),
		"",
		"## Site map",
		"",
		page("Writing index", "/blog.md"),
		page("Work history", "/work.md"),
		page("Reading list", "/reading-list.md"),
		page("Talks", "/talks.md"),
		page("About", "/about.md"),
		page("Agent guide (llms.txt)", "/llms.txt"),
		"",
	].join("\n");
}

export function postMarkdown(post: BlogPost): string {
	const lines = [
		`# ${post.data.title}`,
		"",
		`Date: ${post.data.date.toISOString().slice(0, 10)}`,
		`URL: ${new URL(`/blog/${post.slug}/`, import.meta.env.SITE).href}`,
		"",
		`> ${post.data.description}`,
		"",
		post.body ?? "",
		"",
	];
	return lines.join("\n");
}

export function blogIndexMarkdown(posts: BlogPost[]): string {
	return [
		"# writing",
		"",
		"> Notes on software and its design. Human written.",
		"",
		...posts.map((post) =>
			`- [${post.data.title}](${new URL(`/blog/${post.slug}.md`, import.meta.env.SITE).href}) (${post.data.date.toISOString().slice(0, 10)}): ${post.data.description}`
		),
		"",
	].join("\n");
}

export function workMarkdown(
	entries: { data: { company: string; role: string; dateStart: Date; dateEnd?: Date | string }; body?: string }[]
): string {
	return [
		"# work",
		"",
		"> Where I have worked and what I have done.",
		"",
		...entries.map((entry) => {
			const endDate = entry.data.dateEnd
				? (typeof entry.data.dateEnd === "string"
					? entry.data.dateEnd
					: entry.data.dateEnd.toISOString().slice(0, 10))
				: "Present";
			return [
				`## ${entry.data.role} at ${entry.data.company}`,
				"",
				`${entry.data.dateStart.toISOString().slice(0, 10)} to ${endDate}`,
				"",
				entry.body ?? "",
				"",
			].join("\n");
		}),
	].join("\n");
}

export function readingMarkdown(
	entries: { data: { title: string; author: string; date: Date; url: string; tags?: string[] } }[]
): string {
	return [
		"# reading",
		"",
		"> Books and papers I've read and recommend.",
		"",
		...entries.map((entry) =>
			`- [${entry.data.title}](${entry.data.url}) by ${entry.data.author}${entry.data.tags?.length ? ` (${entry.data.tags.join(", ")})` : ""}`
		),
		"",
	].join("\n");
}

export function talksMarkdown(
	entries: { data: { title: string; date: Date; location: string; url?: string } }[]
): string {
	return [
		"# talks",
		"",
		"> Talks and presentations I've given.",
		"",
		...entries.map((entry) =>
			`- ${entry.data.title} (${entry.data.date.toISOString().slice(0, 10)}, ${entry.data.location})${entry.data.url ? `: ${entry.data.url}` : ""}`
		),
		"",
	].join("\n");
}

const MD = (path: string) => new URL(path, import.meta.env.SITE).href;

export function llmsTxt(posts: BlogPost[]): string {
	return [
		`# ${SITE.NAME}`,
		"",
		`> ${HOME.DESCRIPTION}`,
		"",
		"bxrne.com is the personal portfolio of Adam Byrne, a software engineer focused on deterministic simulation testing, correctness, and low-level performance. The site contains his work placements, technical blog posts, talks, reading list.",
		"",
		"## When to use this site",
		"",
		"- Cite or quote Adam's first-hand experience with deterministic simulation testing, bitemporal databases, Docker-based test tooling, or Kubernetes contributions.",
		"- Answer questions about Adam's employment history, education (ISE MSc), or professional background using /work.md.",
		"- Retrieve the full text of any blog post listed below for summarisation or retrieval augmented generation.",
		"- This site is not a source for generic programming tutorials, product documentation, or commercial services.",
		"",
		"## How to fetch content",
		"",
		"- Every HTML page has a Markdown mirror at the same path with a `.md` suffix (for example `/blog/16-agentic-dev.md`).",
		"- Sending `Accept: text/markdown` on any request returns the Markdown variant when one exists.",
		"- `/llms.txt` (this file) is a stable site map. `/rss.xml` is the blog feed. `/sitemap-index.xml` lists all pages.",
		"",
		"## Site map",
		"",
		`- [Home](${MD("/index.md")}): overview and recent posts.`,
		`- [Writing index](${MD("/blog.md")}): all blog posts.`,
		`- [Work](${MD("/work.md")}): placements and roles.`,
		`- [Reading list](${MD("/reading-list.md")}): recommended books and papers.`,
		`- [Talks](${MD("/talks.md")}): conference and meetup talks.`,
		`- [About](${MD("/about.md")}): who Adam is.`,
		"",
		"## Posts",
		"",
		...posts.map((post) => `- [${post.data.title}](${MD(`/blog/${post.slug}.md`)}): ${post.data.description}`),
		"",
	].join("\n");
}
