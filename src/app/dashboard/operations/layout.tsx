import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Operations | AydoCorp',
};

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section>
      {children}
    </section>
  )
} 