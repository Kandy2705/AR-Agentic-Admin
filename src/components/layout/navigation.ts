import {
  Building2,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  MessagesSquare,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar and page titles (Use-case diagram, Hình 3.5). */
export const NAVIGATION: NavGroup[] = [
  { label: 'Overview', items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    label: 'Management',
    items: [
      { to: '/users', label: 'Users', icon: Users },
      { to: '/buildings', label: 'Buildings', icon: Building2 },
    ],
  },
  {
    label: 'User support',
    items: [
      { to: '/questions', label: 'Questions', icon: MessageSquareText },
      { to: '/categories', label: 'Categories', icon: FolderTree },
    ],
  },
  {
    label: 'AI management',
    items: [{ to: '/chats', label: 'Chat histories', icon: MessagesSquare }],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: UserRound },
      { to: '/password', label: 'Change password', icon: KeyRound },
    ],
  },
];

export function pageTitle(pathname: string): string {
  const section = `/${pathname.split('/')[1] ?? ''}`;
  return (
    NAVIGATION.flatMap((group) => group.items).find((item) => item.to === section)?.label ??
    'Page not found'
  );
}
