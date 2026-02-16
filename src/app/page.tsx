import React from 'react';
import HomeContent from '../components/HomeContent';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="container mx-auto px-4 py-12">
      <HomeContent isLoggedIn={!!session} userName={session?.user?.name || ''} />
    </div>
  );
}
