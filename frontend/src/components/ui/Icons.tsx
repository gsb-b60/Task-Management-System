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

/** The GitHub mark used on the OAuth button, sized from the mockup. */
export function IconGithub(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="6.15" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  )
}