import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders user-supplied Markdown (project/task descriptions, including
 * imported GitHub issue bodies, which are GFM). Raw HTML is never rendered —
 * react-markdown skips it — and links open in a new tab.
 *
 * Must not be nested inside a <p> or <button>: Markdown emits block-level
 * elements. Callers keep the surrounding element a <div>.
 */
export function Markdown({ text, className = 'text-sm text-fg' }: { text: string; className?: string }) {
  return (
    <div className={`markdown leading-relaxed ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

function P({ children }: { children?: ReactNode }) {
  return <p className="my-1 first:mt-0 last:mb-0">{children}</p>
}

function H({ level, children }: { level: 1 | 2 | 3 | 4; children?: ReactNode }) {
  const sizes = { 1: 'text-base', 2: 'text-[15px]', 3: 'text-sm', 4: 'text-[13px]' } as const
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'
  return <Tag className={`${sizes[level]} font-semibold text-fg mt-2 mb-1 first:mt-0`}>{children}</Tag>
}

const components = {
  p: P,
  h1: ({ children }: { children?: ReactNode }) => <H level={1}>{children}</H>,
  h2: ({ children }: { children?: ReactNode }) => <H level={2}>{children}</H>,
  h3: ({ children }: { children?: ReactNode }) => <H level={3}>{children}</H>,
  h4: ({ children }: { children?: ReactNode }) => <H level={4}>{children}</H>,
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>
  ),
  li: ({ children, checked }: { children?: ReactNode; checked?: boolean | null }) => (
    <li className={checked !== null && checked !== undefined ? 'list-none -ml-4' : ''}>
      {checked !== null && checked !== undefined && (
        <input type="checkbox" checked={checked} readOnly className="mr-1.5 align-middle" />
      )}
      {children}
    </li>
  ),
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="my-1 border-l-2 border-line pl-2 text-muted">{children}</blockquote>
  ),
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-subtle px-1 py-0.5 font-mono text-[12px] text-fg">{children}</code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="my-1.5 overflow-x-auto rounded-md border border-line bg-subtle p-2 font-mono text-xs text-fg">
      {children}
    </pre>
  ),
  a: ({ children, href }: { children?: ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  hr: () => <hr className="my-2 border-line" />,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-1.5 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-line bg-subtle px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border border-line px-2 py-1 align-top">{children}</td>
  ),
}
