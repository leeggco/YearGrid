import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TopNav from '@/components/TopNav';

import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'YearGrid 年度进度',
  description: '用极简网格可视化一年流逝的进度。'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body
        className={`${inter.className} flex min-h-screen flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-100/60 text-zinc-950 antialiased`}
      >
        <TopNav />

        <div className="min-h-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
