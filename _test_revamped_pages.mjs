import path from "path";
import { pathToFileURL } from "url";

export default async function run(page) {
  const pages = [
    "CENSUS-AND-CAMP.html",
    "FORTUNE-FERGUSON-RESEARCH.html",
    "DOZIER-RESEARCH.html",
    "DOZIER-NEWSPAPERS.html",
    "COLLECTIONS.html",
    "index.html"
  ];

  const report = {};

  for (const p of pages) {
    const fileUrl = pathToFileURL(path.resolve(process.cwd(), p)).href;
    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(100);

    const data = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const h2s = Array.from(document.querySelectorAll("article h2")).map(h => h.innerText.trim());
      return {
        title: document.title,
        h1: h1 ? h1.innerText.trim() : null,
        h2Count: h2s.length,
        h2List: h2s.slice(0, 5),
        overflowX: document.documentElement.scrollWidth > window.innerWidth,
        linksCount: document.querySelectorAll("a").length
      };
    });
    report[p] = data;
  }

  // Test CENSUS-AND-CAMP responsive views
  const censusUrl = pathToFileURL(path.resolve(process.cwd(), "CENSUS-AND-CAMP.html")).href;
  await page.goto(censusUrl, { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  report["CENSUS-AND-CAMP.html"].mobileOverflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  return report;
}
