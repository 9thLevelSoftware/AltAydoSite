import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/auth';
import { redirect } from 'next/navigation';
import MissionPlanner from '@/components/dashboard/MissionPlanner';

export const metadata: Metadata = {
  title: 'Mission Planner | AydoCorp',
};

export default async function MissionPlannerPage() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login?callbackUrl=/dashboard/mission-planner');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[rgba(var(--mg-dark),0.8)] to-[rgba(var(--mg-background),0.9)] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="mg-grid-bg opacity-30"></div>
        <div className="hexagon-bg opacity-20"></div>
        <div className="holo-scan"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <MissionPlanner />
      </div>
    </div>
  );
}
