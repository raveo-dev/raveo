/**
 * Raveo — Lexical Rich Text Renderer
 *
 * Usage in Astro:
 *   import { renderLexical } from '@raveo/ui/richtext';
 *   const html = renderLexical(post.content);
 *   <div class="prose" set:html={html} />
 */

export interface LexicalNode {
    type: string;
    children?: LexicalNode[];
    [k: string]: unknown;
}

export interface LexicalContent {
    root: {
        type: string;
        children: LexicalNode[];
        direction: ("ltr" | "rtl") | null;
        format: "left" | "start" | "center" | "right" | "end" | "justify" | "";
        indent: number;
        version: number;
    };
    [k: string]: unknown;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderChildren(children?: LexicalNode[]): string {
    if (!children?.length) return "";
    return children.map(renderNode).join("");
}

function renderTextFormat(text: string, format: number): string {
    let result = escapeHtml(text);
    if (format & 16) result = `<code>${result}</code>`;
    if (format & 1) result = `<strong>${result}</strong>`;
    if (format & 2) result = `<em>${result}</em>`;
    if (format & 8) result = `<u>${result}</u>`;
    if (format & 4) result = `<s>${result}</s>`;
    if (format & 32) result = `<sub>${result}</sub>`;
    if (format & 64) result = `<sup>${result}</sup>`;
    return result;
}

function renderNode(node: LexicalNode): string {
    switch (node.type) {
        case "text": {
            const text = (node.text as string) ?? "";
            const format = (node.format as number) ?? 0;
            return renderTextFormat(text, format);
        }

        case "linebreak":
            return "<br>";

        case "tab":
            return "\t";

        case "paragraph": {
            const inner = renderChildren(node.children);
            if (!inner || inner === "<br>") return "<p><br></p>";
            return `<p>${inner}</p>`;
        }

        case "heading": {
            const tag = (node.tag as string) ?? "h2";
            return `<${tag}>${renderChildren(node.children)}</${tag}>`;
        }

        case "quote":
            return `<blockquote>${renderChildren(node.children)}</blockquote>`;

        case "list": {
            const listType = node.listType as string;
            const tag = listType === "number" ? "ol" : "ul";
            const start = node.start as number | undefined;
            const startAttr =
                tag === "ol" && start && start !== 1 ? ` start="${start}"` : "";
            return `<${tag}${startAttr}>${renderChildren(node.children)}</${tag}>`;
        }

        case "listitem": {
            const checked = node.checked as boolean | undefined;
            if (checked !== undefined) {
                const checkbox = `<input type="checkbox" disabled${checked ? " checked" : ""}>`;
                return `<li role="checkbox" aria-checked="${checked}">${checkbox}${renderChildren(node.children)}</li>`;
            }
            if (
                node.children?.length === 1 &&
                node.children[0].type === "list"
            ) {
                return `<li>${renderChildren(node.children)}</li>`;
            }
            return `<li>${renderChildren(node.children)}</li>`;
        }

        case "link":
        case "autolink": {
            const fields = node.fields as Record<string, unknown> | undefined;
            const url = escapeHtml(
                ((fields?.url as string) ?? (node.url as string) ?? "").trim(),
            );
            const newTab =
                (fields?.newTab as boolean) ??
                (node.newTab as boolean) ??
                false;
            const rel = newTab ? ' rel="noopener noreferrer"' : "";
            const target = newTab ? ' target="_blank"' : "";
            return `<a href="${url}"${target}${rel}>${renderChildren(node.children)}</a>`;
        }

        case "horizontalrule":
            return "<hr>";

        case "upload": {
            const value = node.value as Record<string, unknown> | undefined;
            if (!value?.url) return "";
            const url = escapeHtml(value.url as string);
            const alt = escapeHtml((value.alt as string) ?? "");
            const width = value.width as number | undefined;
            const height = value.height as number | undefined;
            const dims =
                width && height ? ` width="${width}" height="${height}"` : "";
            return `<figure><img src="${url}" alt="${alt}"${dims} loading="lazy" decoding="async"></figure>`;
        }

        default: {
            return renderChildren(node.children);
        }
    }
}

/**
 * Renders Lexical JSON content to an HTML string.
 */
export function renderLexical(
    content: LexicalContent | null | undefined,
): string {
    if (!content?.root?.children?.length) return "";
    return content.root.children.map(renderNode).join("");
}
