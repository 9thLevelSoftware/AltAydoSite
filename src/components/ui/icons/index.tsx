import React from 'react';

interface IconProps {
  className?: string;
  /** Accessible label. When provided, the icon is exposed to assistive tech; otherwise it is treated as decorative. */
  title?: string;
  'aria-hidden'?: boolean;
}

/**
 * Builds the shared accessibility props for an icon's <svg>.
 * Without a title the icon is decorative (aria-hidden, not focusable);
 * with a title it is exposed as an image with an accessible name.
 */
function getIconA11yProps(title?: string, ariaHidden?: boolean) {
  const hidden = ariaHidden ?? (title ? undefined : true);
  return {
    focusable: 'false' as const,
    'aria-hidden': hidden,
    ...(title ? { role: 'img', 'aria-label': title } : {}),
  };
}

export const PlusIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export const CalendarIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

export const UsersIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

export const ShipIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
    />
  </svg>
);

export const DiscordIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const ClipboardIcon: React.FC<IconProps> = ({
  className = 'w-5 h-5',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export const XIcon: React.FC<IconProps> = ({
  className = 'w-4 h-4',
  title,
  'aria-hidden': ariaHidden,
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    {...getIconA11yProps(title, ariaHidden)}
  >
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
