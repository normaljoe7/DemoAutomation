import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Pulse AI Command Center',
    description: 'AI-powered SDR Automation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} bg-[#0A0A0A] text-white min-h-screen antialiased overflow-hidden flex`}>
                <AppShell>
                    {children}
                </AppShell>
            </body>
        </html>
    );
}
