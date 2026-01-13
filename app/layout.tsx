import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

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
        className={`${inter.className} h-full text-zinc-950 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
