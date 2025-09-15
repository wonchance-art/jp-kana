export const metadata = {
  title: 'JP Kana Trainer',
  description: 'Kanji → Hiragana practice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-dvh bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 antialiased">
        <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-semibold tracking-tight">JP Kana Trainer</a>
            <nav className="flex gap-4 text-sm">
              <a href="/learn" className="hover:underline">Learn</a>
              <a href="/admin/words" className="hover:underline">Admin</a>
              <a href="/auth/signin" className="hover:underline">Sign in</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        <footer className="border-t mt-16">
          <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-slate-500">
            © {new Date().getFullYear()} JP Kana Trainer
          </div>
        </footer>
      </body>
    </html>
  );
}