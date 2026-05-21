import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import bash from "highlight.js/lib/languages/bash";
import shell from "highlight.js/lib/languages/shell";
import python from "highlight.js/lib/languages/python";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import diff from "highlight.js/lib/languages/diff";
import sql from "highlight.js/lib/languages/sql";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import csharp from "highlight.js/lib/languages/csharp";
import plaintext from "highlight.js/lib/languages/plaintext";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("jsx", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("cs", csharp);
hljs.registerLanguage("plaintext", plaintext);
hljs.registerLanguage("text", plaintext);

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: true,
  highlight(str: string, lang: string): string {
    const normalized = (lang || "").trim().split(/\s+/)[0].toLowerCase();
    if (normalized && hljs.getLanguage(normalized)) {
      try {
        return `<pre class="hljs"><code class="language-${escapeAttr(normalized)}">${
          hljs.highlight(str, { language: normalized, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch {
      }
    }
    try {
      const auto = hljs.highlightAuto(str);
      const cls = auto.language ? ` class="language-${escapeAttr(auto.language)}"` : "";
      return `<pre class="hljs"><code${cls}>${auto.value}</code></pre>`;
    } catch {
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    }
  },
});

md.use(taskLists, { label: true, labelAfter: true });

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIndex = token.attrIndex("href");
  if (hrefIndex >= 0) {
    const href = token.attrs![hrefIndex][1];
    if (!/^command:/i.test(href)) {
      token.attrSet("target", "_blank");
      token.attrSet("rel", "noopener noreferrer");
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderMarkdown(body: string): string {
  return md.render(body || "");
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
}

export function escapeHtml(s: string): string {
  return md.utils.escapeHtml(s);
}
