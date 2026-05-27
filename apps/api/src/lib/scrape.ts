/**
 * Tiny HTML-to-text scraper for URL ingest.
 * Uses cheerio to strip scripts/styles and pull readable text.
 */
import * as cheerio from "cheerio";

export async function scrapeUrlToText(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RiriBot/0.1; +https://Riri.ai/bot)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  // Strip noise
  $("script, style, noscript, iframe, svg, nav, footer, header, form").remove();

  const title = ($("title").first().text() || $("h1").first().text() || url).trim();

  // Prefer <main> or <article>, fall back to body
  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");
  const text = root
    .text()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");

  return { title, text };
}
