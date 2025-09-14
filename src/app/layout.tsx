export const metadata = {
  title: 'JP Kana Trainer',
  description: 'Kanji → Hiragana practice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
