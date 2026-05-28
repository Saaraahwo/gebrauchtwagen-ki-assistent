import { redirect } from 'next/navigation';
import { getSellerFromCookies } from '@/lib/auth/require-seller';
import { Header } from '@/components/Header';
import { SellerDashboard } from '@/components/SellerDashboard';

export default async function DashboardPage() {
  const seller = await getSellerFromCookies();
  if (!seller) redirect('/login');

  return (
    <>
      <Header />
      <SellerDashboard />
    </>
  );
}
