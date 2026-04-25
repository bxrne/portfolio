# AGENTS.md

## Project Purpose

Personal portfolio website showcasing work placements, blog posts, and reading list. All content is authored in Markdown and served statically via Astro.

## Tech Stack

- **Framework**: Astro 5.x (static site generation)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.x with custom theme
- **Package Manager**: pnpm 10.x
- **Build Tool**: Astro CLI
- **Analytics**: Vercel Analytics + Speed Insights
- **Node Version**: ES2024

## Language & Framework Conventions

### TypeScript
- **Config**: `tsconfig.json` extends `astro/tsconfigs/strict` with `strictNullChecks: true`
- **Path Aliases**: Use `@*` for imports from `src/*` (e.g., `@components`, `@lib`, `@consts`)
- Prefer explicit type definitions over inference
- Strict null checking enforced

### Astro Components
- **File Extension**: `.astro` for pages and components
- **Structure**: Frontmatter (JavaScript/TypeScript) separated by `---` from HTML template
- Use named exports for layouts and reusable components
- Props typed with TypeScript interfaces/types
- Nested components imported from `src/components/`

### MDX Content
- **Supported Formats**: `.md` (Markdown) and `.mdx` (JSX in Markdown)
- Processed via `@astrojs/mdx` integration
- Content organized in collections: `blog`, `work`, `reading`

## Code Style

### Formatting
- **Quotes**: Double quotes enforced (eslint rule)
- **Semicolons**: Always required (eslint rule)
- **Template Literals**: Allowed instead of double quotes where appropriate
- **Line Length**: No hard limit; use judgment (Tailwind classes may be lengthy)

### ESLint Configuration
- Extends: `eslint:recommended`, `plugin:astro/recommended`, `plugin:@typescript-eslint/recommended`
- Parser for `.astro` files: `astro-eslint-parser` with `@typescript-eslint/parser`
- Run `npm run lint` to check, `npm run lint:fix` to auto-fix

### Tailwind CSS
- **Custom Theme**: Located in `tailwind.config.mjs`
- **Font Families**:
  - `sans`: Inter (primary)
  - `serif`: Playfair Display
  - `mono`: Geist Mono, JetBrains Mono
- **Custom Colors** (paper theme):
  - `paper-bg: #faf8f5`
  - `paper-fg: #1a1a1a`
  - `paper-muted: #6b6b6b`
  - `paper-border: #e0dcd7`
  - `paper-accent: #1a1a1a`
  - `paper-hover: #555555`
- Responsive design with `md:` and `lg:` breakpoints
- Typography plugin enabled for styled markdown content

### Naming
- **Components**: PascalCase (e.g., `Container.astro`, `BackToTop.astro`)
- **Utilities**: camelCase (e.g., `formatDate()`, `readingTime()`)
- **Types**: PascalCase (e.g., `Site`, `Metadata`, `Socials`)

## Content Collections & Schema

### Blog Collection
- **Path**: `src/content/blog/`
- **Schema**: `title` (string), `description` (string), `date` (date), `draft` (boolean, optional)

### Work Collection
- **Path**: `src/content/work/`
- **Schema**: `company` (string), `role` (string), `dateStart` (date), `dateEnd` (date | string)

### Reading Collection
- **Path**: `src/content/reading/`
- **Schema**: `title` (string), `author` (string), `date` (date), `url` (string), `tags` (array, optional), `draft` (boolean, optional)

## Testing & Validation

- **Type Checking**: `astro check` (run before build)
- **Linting**: `eslint .` with TypeScript and Astro plugins
- **Build Validation**: `npm run build` runs type check then builds
- No automated test framework configured; focus on static type safety and linting

## Build & Development

### Scripts
- `npm run dev` – Local dev server (localhost:3000)
- `npm run dev:network` – Dev server accessible from network
- `npm run build` – Type check + static build to `dist/`
- `npm run preview` – Preview built site locally
- `npm run preview:network` – Preview from network
- `npm run lint` – Run ESLint
- `npm run lint:fix` – Auto-fix ESLint issues

### Site Config
- **Site URL**: `https://bxrne.com` (in `astro.config.mjs`)
- **Integrations**: MDX, Sitemap, Tailwind, Vercel Analytics
- **Output**: Static HTML in `dist/` directory

## Directory Layout

```
.
├── src/
│   ├── pages/                 # Route pages (index.astro, blog/, work/, etc.)
│   ├── layouts/               # Reusable page layouts (PageLayout.astro)
│   ├── components/            # Reusable .astro components
│   ├── content/               # Markdown/MDX collections
│   │   ├── blog/              # Blog posts
│   │   ├── work/              # Work experience
│   │   ├── reading/           # Reading list
│   │   └── config.ts          # Collection schema definitions
│   ├── lib/                   # Utility functions (utils.ts)
│   ├── styles/                # Global CSS
│   ├── consts.ts              # Site constants
│   ├── types.ts               # TypeScript type definitions
│   └── env.d.ts               # Astro environment types
├── public/                    # Static assets (served as-is)
├── dist/                      # Build output (generated)
├── astro.config.mjs           # Astro configuration
├── tailwind.config.mjs        # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── .eslintrc.cjs              # ESLint configuration
├── package.json               # Project dependencies
└── pnpm-lock.yaml             # Lockfile

```

## Key Utilities

- `cn()` – Class name merging (clsx + tailwind-merge)
- `formatDate()` – Format Date objects to "MMM DD, YYYY"
- `readingTime()` – Estimate reading time from HTML (200 words/minute)
- `dateRange()` – Format date ranges for work experience

## Notes for Contributors

1. Keep content in appropriate collections (blog/, work/, reading/)
2. Use `draft: true` to exclude content from production builds
3. Run `npm run lint:fix` before committing to maintain code style
4. Run `npm run build` to verify type safety and build integrity
5. Import from `@components`, `@lib`, etc. using path aliases
6. Write responsive designs with Tailwind; test at md/lg breakpoints
