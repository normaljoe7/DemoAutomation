import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pulse AI Command Center',
  description: 'AI-powered SDR Automation',
};

import { Sidebar } from '@/components/layout/sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0A0A0A] text-white min-h-screen antialiased overflow-hidden flex`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-[#050505] scrollbar-thin scrollbar-track-[#050505] scrollbar-thumb-zinc-800">
          {children}
        </main>
      </body>
    </html>
  );
}
