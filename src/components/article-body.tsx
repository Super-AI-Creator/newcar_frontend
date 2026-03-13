import type { ReactNode } from "react";

/**
 * Minimal markdown-style renderer for article content. No external deps.
 * Supports: paragraphs, **bold**, [text](url), ## / ### headings, - lists.
 */
export function ArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter(Boolean);
  return (
    <div className="article-body space-y-4 text-ink-700">
      {blocks.map((block, i) => (
        <Block key={i} block={block.trim()} />
      ))}
    </div>
  );
}

function Block({ block }: { block: string }) {
  if (block.startsWith("## ")) {
    return <h2 className="mt-6 font-display text-xl font-semibold text-ink-900">{parseInline(block.slice(3))}</h2>;
  }
  if (block.startsWith("### ")) {
    return <h3 className="mt-4 font-display text-lg font-semibold text-ink-900">{parseInline(block.slice(4))}</h3>;
  }
  if (block.startsWith("- ")) {
    const items = block.split(/\n(?=- )/).map((line) => line.replace(/^- \s*/, ""));
    return (
      <ul className="list-disc space-y-1 pl-6">
        {items.map((item, j) => (
          <li key={j}>{parseInline(item)}</li>
        ))}
      </ul>
    );
  }
  return <p className="leading-relaxed">{parseInline(block)}</p>;
}

function parseInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    const bold = rest.match(/\*\*(.+?)\*\*/);
    const link = rest.match(/\[([^\]]+)\]\(([^)]+)\)/);
    let match: RegExpMatchArray | null = null;
    let type: "bold" | "link" = "bold";
    if (link && (!bold || link.index! <= (bold.index ?? Infinity))) {
      match = link;
      type = "link";
    } else if (bold) {
      match = bold;
    }
    if (match) {
      const i = match.index!;
      if (i > 0) parts.push(<span key={key++}>{rest.slice(0, i)}</span>);
      if (type === "bold") {
        parts.push(<strong key={key++} className="font-semibold text-ink-900">{match[1]}</strong>);
      } else {
        const href = match[2];
        const isInternal = href.startsWith("/");
        parts.push(
          isInternal ? (
            <a key={key++} href={href} className="font-medium text-brand-700 underline hover:no-underline">{match[1]}</a>
          ) : (
            <a key={key++} href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-700 underline hover:no-underline">{match[1]}</a>
          )
        );
      }
      rest = rest.slice(i + match[0].length);
    } else {
      parts.push(<span key={key++}>{rest}</span>);
      break;
    }
  }
  return <>{parts}</>;
}
