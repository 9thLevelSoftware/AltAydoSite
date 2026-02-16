import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subsidiaries | AydoCorp',
};

export default function SubsidiariesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  )
} 