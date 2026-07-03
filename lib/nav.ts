export type NavActive = 'dashboard' | 'humanizer' | 'history' | 'settings';

export const NAV_ITEMS: Array<{
  id: NavActive;
  href: string;
  label: string;
  icon: string;
  filled?: boolean;
}> = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'humanizer', href: '/process', label: 'Humanizer', icon: 'auto_awesome', filled: true },
  { id: 'history', href: '/dashboard#history', label: 'History', icon: 'history' },
  { id: 'settings', href: '/settings', label: 'Settings', icon: 'tune' }
];
