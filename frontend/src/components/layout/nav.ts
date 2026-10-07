export interface NavItem {
  label: string
  to: string
}

/** Order is fixed across the topbar, the sidebar and the mobile drawer. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'Board', to: '/board' },
  { label: 'Roadmap', to: '/roadmap' },
  { label: 'Projects', to: '/projects' },
]

export const SIDEBAR_VIEWS: NavItem[] = NAV_ITEMS.filter((item) => item.to !== '/projects')