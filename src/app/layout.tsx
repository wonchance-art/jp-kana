import { Inter } from 'next/font/google';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'JP Kana Trainer',
  description: 'Kanji → Hiragana practice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={inter.className}>
      <body className="min-h-dvh bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 antialiased">
        {/* 키보드 사용자용 Skip 링크 */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 rounded-md px-1">
              JP Kana Trainer
            </Link>

            {/* 개선된 Nav */}
            <NavBar />
          </div>
        </header>

        <main id="main" className="mx-auto max-w-5xl px-4 py-10">{children}</main>

        <footer className="border-t mt-16">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-500">
            © {new Date().getFullYear()} JP Kana Trainer
          </div>
        </footer>
      </body>
    </html>
  );
}