import { chromium } from "/Users/florin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const inputUrl = "file:///Users/florin/Desktop/one-dining-club/landing/presentation.html";
const outputPath = "/Users/florin/Desktop/one-dining-club/landing/YUMZY-presentation.pdf";

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });

  await page.goto(inputUrl, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: outputPath,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" },
  });

  console.log(outputPath);
} finally {
  await browser.close();
}
