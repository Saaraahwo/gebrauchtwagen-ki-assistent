import { Header } from '@/components/Header';
import { SellerLogin } from '@/components/SellerLogin';

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="max-w-layout mx-auto px-6">
        <SellerLogin />
      </main>
    </>
  );
}
