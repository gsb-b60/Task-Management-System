import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Frame({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconInfo(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.6h.01" />
    </Frame>
  )
}

export function IconAlert(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M8.2 3h7.6l5.2 5.2v7.6l-5.2 5.2H8.2L3 15.8V8.2z" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </Frame>
  )
}

export function IconCheck(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Frame>
  )
}

export function IconChevronDown(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Frame>
  )
}

export function IconArrowRight(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </Frame>
  )
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M20 12H5" />
      <path d="m11 6-6 6 6 6" />
    </Frame>
  )
}

export function IconArrowUp(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 20V5" />
      <path d="m6 11 6-6 6 6" />
    </Frame>
  )
}

export function IconArrowDown(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 5v15" />
      <path d="m6 13 6 6 6-6" />
    </Frame>
  )
}

export function IconArrowOut(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="m16.5 8.5 3.5 3.5-3.5 3.5" />
      <path d="M20 12h-8.5" />
    </Frame>
  )
}

export function IconGear(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7 18 18M18 6l-1.3 1.3M7.3 16.7 6 18" />
    </Frame>
  )
}

export function IconMenu(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Frame>
  )
}

export function IconClose(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </Frame>
  )
}

export function IconDots(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="12" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" />
    </Frame>
  )
}

export function IconRepo(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M4 6a2 2 0 0 1 2-2h4v16H6a2 2 0 0 1-2-2z" />
      <path d="M20 6a2 2 0 0 0-2-2h-4v16h4a2 2 0 0 0 2-2z" />
    </Frame>
  )
}

export function IconCalendar(props: IconProps) {
  return (
    <Frame {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5V7M15.5 3.5V7" />
    </Frame>
  )
}

export function IconSearch(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m15.4 15.4 4.1 4.1" />
    </Frame>
  )
}

export function IconRetry(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.5 4.5V10H14" />
    </Frame>
  )
}

export function IconInbox(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
      <path d="M6 6h12" />
      <path d="M6 10h12" />
      <path d="M6 14h12" />
      <path d="M6 18h12" />
    </Frame>
  )
}

export function IconPlus(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M12 5v14M5 12h14" />
    </Frame>
  )
}

export function IconTrash(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Frame>
  )
}

export function IconEdit(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Frame>
  )
}

export function IconGrip(props: IconProps) {
  return (
    <Frame {...props}>
      <circle cx="9" cy="6" r="1" />
      <circle cx="15" cy="6" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="1" />
    </Frame>
  )
}

export function IconExternalLink(props: IconProps) {
  return (
    <Frame {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </Frame>
  )
}

export function IconGithub(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="6.15" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}