import './globals.css';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type React from 'react';

import { Toaster } from '@/components/toaster';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Humanizer AI',
  description: 'Humanize text and estimate AI detection risk.'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className={`${inter.variable} font-body-md bg-background text-on-background antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
