import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date) {
  return Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function readingTime(html: string) {
  const textOnly = html.replace(/<[^>]+>/g, "");
  const wordCount = textOnly.split(/\s+/).length;
  const readingTimeMinutes = (wordCount / 200 + 1).toFixed();
  return `${readingTimeMinutes} min read`;
}

export function dateRange(startDate: Date, endDate?: Date | string): string {
  if (!endDate) {
    return `${startDate.toLocaleString("default", { month: "short" })} ${startDate
      .getFullYear()
      .toString()} - Present`;
  }

  const start = `${startDate.toLocaleString("default", { month: "short" })} ${startDate
    .getFullYear()
    .toString()}`;

  const end =
    typeof endDate === "string"
      ? endDate
      : `${endDate.toLocaleString("default", { month: "short" })} ${endDate
          .getFullYear()
          .toString()}`;

  return `${start} - ${end}`;
}
