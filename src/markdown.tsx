import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("```")) {
          const body = trimmed.replace(/^```[a-z]*\n?/, "").replace(/```$/, "");
          return <pre key={index}><code>{body}</code></pre>;
        }
        if (trimmed.startsWith("### ")) return <h3 key={index}>{inline(trimmed.slice(4))}</h3>;
        if (trimmed.startsWith("## ")) return <h2 key={index}>{inline(trimmed.slice(3))}</h2>;
        if (trimmed.startsWith("# ")) return <h2 key={index}>{inline(trimmed.slice(2))}</h2>;
        if (trimmed.split("\n").every((line) => line.startsWith("- "))) {
          return (
            <ul key={index}>
              {trimmed.split("\n").map((line) => (
                <li key={line}>{inline(line.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{inline(trimmed.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}

export function splitReveal(source: string): { before: string; after: string } {
  const marker = "<!-- reveal -->";
  const index = source.indexOf(marker);
  if (index === -1) return { before: source, after: "" };
  return { before: source.slice(0, index), after: source.slice(index + marker.length) };
}
