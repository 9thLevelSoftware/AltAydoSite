import { redirect } from 'next/navigation';

// The interactive Fleet Database experience lives at /dashboard/fleet-database.
// This /dashboard/operations/fleet route was only a "COMING SOON" stub and is
// not linked from anywhere, so until dedicated fleet operations content is
// built out we redirect to the working Fleet Database page rather than expose
// a placeholder.
export default function FleetOperationsPage() {
  redirect('/dashboard/fleet-database');
}
