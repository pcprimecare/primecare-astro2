export interface NavItem {
  label: string;
  href: string;
}

/** Main navigation. "Doctors" matches how patients search. */
export const primaryNav: NavItem[] = [
  { label: 'Services', href: '/services/' },
  { label: 'Rejuvenation', href: '/rejuvenation/' },
  { label: 'Doctors', href: '/doctors/' },
  { label: 'Forms', href: '/forms/' },
  { label: 'Health info', href: '/health-info/' },
  { label: 'Contact', href: '/contact/' },
];

export const bookNav: NavItem = { label: 'Book an appointment', href: '/book/' };

export const legalNav: NavItem[] = [
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Accessibility', href: '/accessibility/' },
];
