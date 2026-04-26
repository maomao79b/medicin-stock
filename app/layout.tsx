import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NavShell from './components/NavShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'HAPPYTEETH - Inventory',
  description: 'Dental Clinic, Nichada Inventory Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NavShell>
          {children}
        </NavShell>
      </body>
    </html>
  );
}
