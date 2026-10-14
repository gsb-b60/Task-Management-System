import { IconGithub } from '../ui/Icons'

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/gsb-b60' },
  { label: 'Portfolio', href: 'https://gsb-b60.github.io/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/hieu-nguyendinh-969b21247' },
]

/** Author credit + profile links, pinned under every protected screen. */
export function Footer() {
  return (
    <footer className="border-t border-line px-5 py-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs text-faint">
      <span>
        Built by <span className="font-medium text-muted">Nguyen Dinh Hieu</span>
      </span>
      <nav aria-label="Author profiles" className="flex items-center gap-4">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-accent hover:underline"
          >
            {link.label === 'GitHub' && <IconGithub className="w-3.5 h-3.5" />}
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  )
}
