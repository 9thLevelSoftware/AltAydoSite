import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AydoExpress | AydoCorp',
};

export default function AydoExpressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
