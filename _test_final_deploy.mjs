import path from "path";
import { pathToFileURL } from "url";

export default async function run(page) {
  const pages = [
    "index.html",
    "index2.html",
    "DOZIER-RESEARCH.html",
    "DOZIER-NEWSPAPERS.html",
    "COLLECTIONS.html",
    "BOOKS-AND-MANUSCRIPTS.html",
    "SEARCH.html"
  ];

  const report = {};

  for (const p of pages) {
    const fileUrl = pathToFileURL(path.resolve(process.cwd(), p)).href;
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    const data = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      return {
        title: document.title,
        h1: h1 ? h1.innerText.trim() : null,
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        linksCount: document.querySelectorAll("a").length,
        hasBrokenImages: Array.from(document.querySelectorAll("img")).some(i => i.naturalWidth === 0 && i.src)
      };
    });
    report[p] = data;
  }

  // Test DOZIER-NEWSPAPERS interactive filter
  const newspapersUrl = pathToFileURL(path.resolve(process.cwd(), "DOZIER-NEWSPAPERS.html")).href;
  await page.goto(newspapersUrl, { waitUntil: "domcontentloaded" });
  await page.click('button[data-decade="1940s"]');
  await page.waitForTimeout(100);
  const decade1940Count = await page.evaluate(() => document.querySelectorAll(".issue-card").length);
  report["DOZIER-NEWSPAPERS.html"].decade1940Count = decade1940Count;

  // Test COLLECTIONS.html 5th collection
  const collUrl = pathToFileURL(path.resolve(process.cwd(), "COLLECTIONS.html")).href;
  await page.goto(collUrl, { waitUntil: "domcontentloaded" });
  const coll5 = await page.evaluate(() => {
    const cards = document.querySelectorAll(".collection");
    return {
      totalCollections: cards.length,
      collection5Title: cards[4] ? cards[4].querySelector("h3").innerText : null,
      collection5Href: cards[4] ? cards[4].querySelector("a").getAttribute("href") : null
    };
  });
  report["COLLECTIONS.html"].collection5Test = coll5;

  return report;
}
