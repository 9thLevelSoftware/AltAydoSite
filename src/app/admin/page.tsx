import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/auth';
import AdminDashboardContent from '@/components/admin/AdminDashboardContent';
import AccessDenied from '@/components/admin/AccessDenied';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  // Check if user is logged in
  if (!session) {
    redirect('/login');
  }

  // Authorize via NextAuth session claims. Fail closed when role/clearance
  // are missing (`?? 0`). Mirrors the guard used in API routes such as
  // /api/storage-status.
  const isAdmin = session.user?.role === 'admin' || (session.user?.clearanceLevel ?? 0) >= 4;

  if (!isAdmin) {
    return <AccessDenied />;
  }

  return <AdminDashboardContent />;
}
