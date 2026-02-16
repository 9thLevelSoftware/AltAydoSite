import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events | AydoCorp',
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
