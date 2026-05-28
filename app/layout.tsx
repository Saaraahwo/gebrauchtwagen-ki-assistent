import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BMW Gebrauchtwagensuche',
  description: 'Transparente Gebrauchtwagenanalyse mit KI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
