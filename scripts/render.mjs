#!/usr/bin/env node
// Renders README.md to a GitHub-styled HTML preview.
// Usage:
//   node scripts/render.mjs            Build a one-shot preview into .preview/index.html
//   node scripts/render.mjs --serve    Serve a live preview (re-renders on every request)

import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { marked } = require("marked");

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = join(repoRoot, "README.md");
const outDir = join(repoRoot, ".preview");
const outFile = join(outDir, "index.html");
const port = Number(process.env.PREVIEW_PORT || 4000);

// GitHub's profile READMEs render with GitHub Flavored Markdown.
marked.setOptions({ gfm: true, breaks: false });

// github-markdown-css ships the exact stylesheet GitHub uses for rendered markdown.
const githubCssPath = require.resolve("github-markdown-css/github-markdown-light.css");

async function renderHtml() {
  const [markdown, css] = await Promise.all([
    readFile(readmePath, "utf8"),
    readFile(githubCssPath, "utf8"),
  ]);
  const body = marked.parse(markdown);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Profile README preview</title>
<style>${css}
body { margin: 0; background: #f6f8fa; }
.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 24px auto;
  padding: 32px;
  background: #ffffff;
  border: 1px solid #d0d7de;
  border-radius: 6px;
}
</style>
</head>
<body>
<article class="markdown-body">
${body}
</article>
</body>
</html>`;
}

async function build() {
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, await renderHtml(), "utf8");
  console.log(`Wrote preview to ${outFile}`);
}

async function serve() {
  const server = createServer(async (req, res) => {
    try {
      // Re-render on every request so edits to README.md show up on refresh.
      const html = await renderHtml();
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Failed to render README.md:\n${err?.stack || err}`);
    }
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Live README preview on http://0.0.0.0:${port} (re-renders on refresh)`);
  });
}

if (process.argv.includes("--serve")) {
  await serve();
} else {
  await build();
}
