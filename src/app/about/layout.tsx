import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About | AydoCorp',
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
