import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Archives | AydoCorp',
};

export default function ArchivesLayout({
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