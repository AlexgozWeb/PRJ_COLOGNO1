import { Fragment, type ReactNode } from "react"

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>
  )
}

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim())
const isSep = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)

// Renderer Markdown minimale: paragrafi, elenchi, grassetto, tabelle a pipe
export default function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n")
  const out: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.includes("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      const head = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes("|")) rows.push(cells(lines[i++]))
      out.push(
        <div key={out.length} className="overflow-x-auto my-2">
          <table className="text-xs border-collapse">
            <thead><tr>{head.map((h, k) => <th key={k} className="border border-slate-300 bg-slate-100 px-2 py-1 text-left">{inline(h)}</th>)}</tr></thead>
            <tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} className="border border-slate-300 px-2 py-1">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
    } else if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""))
      out.push(<ul key={out.length} className="list-disc pl-5 my-1">{items.map((t, k) => <li key={k}>{inline(t)}</li>)}</ul>)
    } else if (line.trim() === "") {
      i++
    } else {
      out.push(<p key={out.length} className="my-1">{inline(line.replace(/^#+\s*/, ""))}</p>)
      i++
    }
  }
  return <>{out}</>
}
