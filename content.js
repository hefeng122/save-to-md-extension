// Collect page content and convert to Markdown, then ask background to download

(function () {
  function sanitizeFilename(name) {
    return name
      .replace(/[\\/:*?"<>|\n\r]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function getMainContainer() {
    const preferred = document.querySelector("article, main, [role='main']");
    return preferred || document.body;
  }

  // Simple HTML -> Markdown converter (subset, good-enough for most pages)
  const BLOCK_TAGS = new Set([
    "P","DIV","SECTION","ARTICLE","HEADER","FOOTER","MAIN","ASIDE",
    "H1","H2","H3","H4","H5","H6",
    "UL","OL","LI","PRE","CODE","BLOCKQUOTE","HR","BR","TABLE",
    "FIGURE","FIGCAPTION"
  ]);

  function escapeInline(text) {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/\*/g, "\\*")
      .replace(/_/g, "\\_")
      .replace(/`/g, "\\`")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/#/g, "\\#");
  }

  function getLanguageFromClass(el) {
    const c = el.className || "";
    const m = String(c).match(/(?:language|lang)-([\w+-]+)/i);
    return m ? m[1] : "";
  }

  function isBlock(el) {
    return BLOCK_TAGS.has(el.tagName);
  }

  function trimEmptyLines(text) {
    return text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
  }

  function convertInline(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue.replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node;
    const tag = el.tagName;
    switch (tag) {
      case "A": {
        const href = el.getAttribute("href") || "";
        const text = Array.from(el.childNodes).map(convertInline).join("").trim() || href;
        if (!href) return text;
        return `[${escapeInline(text)}](${href})`;
      }
      case "CODE": {
        // Inline code only; PRE handled separately
        if (el.parentElement && el.parentElement.tagName === "PRE") return el.textContent;
        return "`" + el.textContent.trim().replace(/\n+/g, " ") + "`";
      }
      case "EM":
      case "I": {
        const inner = Array.from(el.childNodes).map(convertInline).join("");
        return `*${inner.trim()}*`;
      }
      case "STRONG":
      case "B": {
        const inner = Array.from(el.childNodes).map(convertInline).join("");
        return `**${inner.trim()}**`;
      }
      case "IMG": {
        const alt = el.getAttribute("alt") || "";
        const src = el.getAttribute("src") || "";
        if (!src) return "";
        return `![${escapeInline(alt)}](${src})`;
      }
      case "BR":
        return "\n";
      default: {
        const inner = Array.from(el.childNodes).map(convertInline).join("");
        return inner;
      }
    }
  }

  function convertBlock(node, indentLevel = 0, listState = null) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue.replace(/\s+/g, " ");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node;
    const tag = el.tagName;
    const indent = "  ".repeat(indentLevel);

    switch (tag) {
      case "H1":
      case "H2":
      case "H3":
      case "H4":
      case "H5":
      case "H6": {
        const level = parseInt(tag.substring(1), 10);
        const text = Array.from(el.childNodes).map(convertInline).join("").trim();
        return `\n${"#".repeat(Math.min(level, 6))} ${text}\n\n`;
      }
      case "P": {
        const text = Array.from(el.childNodes).map(convertInline).join("").trim();
        return text ? `\n${text}\n\n` : "\n";
      }
      case "BR": {
        return "\n";
      }
      case "HR": {
        return "\n---\n\n";
      }
      case "BLOCKQUOTE": {
        const inner = trimEmptyLines(Array.from(el.childNodes).map(n => convertBlock(n, indentLevel)).join("")).split("\n").map(l => "> " + l).join("\n");
        return `\n${inner}\n\n`;
      }
      case "PRE": {
        const code = el.querySelector("code");
        const lang = code ? getLanguageFromClass(code) : getLanguageFromClass(el);
        const text = (code || el).textContent.replace(/\s+$/, "");
        return `\n\n\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
      }
      case "UL": {
        let out = "\n";
        Array.from(el.children).forEach((li) => {
          if (li.tagName !== "LI") return;
          const content = convertListItem(li, indentLevel, "ul");
          out += content;
        });
        return out + "\n";
      }
      case "OL": {
        let out = "\n";
        let index = 1;
        Array.from(el.children).forEach((li) => {
          if (li.tagName !== "LI") return;
          const content = convertListItem(li, indentLevel, "ol", index);
          out += content;
          index++;
        });
        return out + "\n";
      }
      case "TABLE": {
        return convertTable(el);
      }
      case "FIGURE": {
        return Array.from(el.childNodes).map(n => convertBlock(n, indentLevel)).join("");
      }
      default: {
        // Container or inline
        if (isBlock(el)) {
          const inner = Array.from(el.childNodes).map(n => convertBlock(n, indentLevel)).join("");
          return inner;
        } else {
          return Array.from(el.childNodes).map(convertInline).join("");
        }
      }
    }
  }

  function convertListItem(li, indentLevel, type, index = 1) {
    const indent = "  ".repeat(indentLevel);
    // Separate block content inside li: split first block element vs inline
    const parts = [];
    let firstLine = [];
    Array.from(li.childNodes).forEach((n) => {
      if (n.nodeType === Node.ELEMENT_NODE && isBlock(n)) {
        if (firstLine.length) {
          parts.push(firstLine.map(convertInline).join("").trim());
          firstLine = [];
        }
        parts.push(convertBlock(n, indentLevel + 1));
      } else {
        firstLine.push(n);
      }
    });
    if (firstLine.length) {
      parts.unshift(firstLine.map(convertInline).join("").trim());
    }
    const marker = type === "ol" ? `${index}. ` : "- ";
    let out = indent + marker + (parts.shift() || "") + "\n";
    const sub = parts.join("").trim();
    if (sub) {
      out += sub
        .split("\n")
        .filter(Boolean)
        .map((l) => indent + "  " + l)
        .join("\n") + "\n";
    }
    return out;
  }

  function convertTable(tableEl) {
    const rows = Array.from(tableEl.querySelectorAll("tr"));
    if (!rows.length) return "";
    const getCells = (row) => Array.from(row.children).filter(c => c.tagName === "TH" || c.tagName === "TD");
    const headerCells = getCells(rows[0]);
    let md = "\n";
    if (headerCells.some(c => c.tagName === "TH")) {
      const headers = headerCells.map(c => escapeInline(c.textContent.trim()) || " ").join(" | ");
      md += `| ${headers} |\n| ${headerCells.map(() => "---").join(" | ")} |\n`;
      rows.slice(1).forEach(r => {
        const cols = getCells(r).map(c => escapeInline(c.textContent.trim()));
        md += `| ${cols.join(" | ")} |\n`;
      });
    } else {
      rows.forEach(r => {
        const cols = getCells(r).map(c => escapeInline(c.textContent.trim()));
        md += `| ${cols.join(" | ")} |\n`;
      });
    }
    md += "\n";
    return md;
  }

  function buildMarkdown() {
    const title = document.title || "Untitled";
    const url = location.href;
    const savedAt = new Date();
    const y = savedAt.getFullYear();
    const mm = String(savedAt.getMonth() + 1).padStart(2, '0');
    const dd = String(savedAt.getDate()).padStart(2, '0');
    const hh = String(savedAt.getHours()).padStart(2, '0');
    const mi = String(savedAt.getMinutes()).padStart(2, '0');
    const ss = String(savedAt.getSeconds()).padStart(2, '0');

    const container = getMainContainer();
    const bodyMd = trimEmptyLines(Array.from(container.childNodes).map(n => convertBlock(n)).join("")).replace(/\s+$/g, "");

    const header = `# ${title}\n\n> URL: ${url}\n> Saved: ${y}-${mm}-${dd} ${hh}:${mi}:${ss}\n\n`;
    const md = header + bodyMd + "\n";

    const filename = `${y}${mm}${dd}-${hh}${mi}-${sanitizeFilename(title) || "page"}.md`;
    return { filename, md };
  }

  try {
    const { filename, md } = buildMarkdown();
    chrome.runtime.sendMessage({ type: "SAVE_MD", filename, markdown: md }, (resp) => {
      // no-op
    });
  } catch (e) {
    alert("Save as Markdown failed: " + e.message);
    console.error(e);
  }
})();

