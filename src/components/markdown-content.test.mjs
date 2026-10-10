import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { outputText } = ts.transpileModule(
  readFileSync(new URL("./markdown-content.tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  },
);
const compiled = { exports: {} };
runInNewContext(outputText, {
  exports: compiled.exports,
  require: (name) => {
    if (name === "react-markdown") return { __esModule: true, default: Markdown };
    if (name === "remark-gfm") return { __esModule: true, default: remarkGfm };
    return require(name);
  },
});
const { MarkdownContent } = compiled.exports;

function render(content) {
  return renderToStaticMarkup(createElement(MarkdownContent, { content }));
}

test("renders Markdown headings, emphasis, lists, links, and fenced code", () => {
  const html = render(
    "# About\n\nOur **business**.\n\n- First\n- Second\n\n[Visit](https://example.com)\n\n```js\nconst value = 1;\n```",
  );
  assert.match(html, /<h1>About<\/h1>/);
  assert.match(html, /<strong>business<\/strong>/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>First<\/li>/);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /<pre><code class="language-js">const value = 1;/);
});

test("renders GFM tables, task lists, and strikethrough", () => {
  const html = render(
    "| Name | Status |\n| --- | --- |\n| Page | Done |\n\n- [x] Finished\n\n~~Old content~~",
  );
  assert.match(html, /<div class="overflow-x-auto"><table>/);
  assert.match(html, /<th>Name<\/th>/);
  assert.match(html, /<td>Done<\/td>/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /checked=""/);
  assert.match(html, /<del>Old content<\/del>/);
});

test("does not render raw HTML or unsafe link protocols", () => {
  const html = render(
    '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[Unsafe](javascript:alert%281%29)\n\n[Safe](https://example.com)',
  );
  assert.doesNotMatch(html, /<script|<img|onerror|javascript:/);
  assert.match(html, /href="https:\/\/example.com"/);
});
