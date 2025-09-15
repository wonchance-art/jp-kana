'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';

type NavItem = { href: string; label: string };
const NAV_ITEMS: NavItem[] = [
  { href: '/learn', label: 'Learn' },
  { href: '/admin/words', label: 'Admin' },
  { href: '/auth/signin', label: 'Sign in' },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // 라우트 변경 시 모바일 메뉴 자동 닫기
  useEffect(() => { setOpen(false); }, [pathname]);

  // ESC로 모바일 메뉴 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const linkBase =
    'inline-flex items-center rounded-md px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60';

  return (
    <div className="flex items-center gap-3">
      {/* 데스크톱 */}
      <nav className="hidden md:flex gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? `${linkBase} bg-slate-900 text-white`
                  : `${linkBase} text-slate-700 hover:bg-slate-100`
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 모바일 토글 버튼 */}
      <button
        ref={btnRef}
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* 모바일 드롭다운 */}
      {open && (
        <div
          role="dialog"
          aria-label="Mobile navigation"
          className="absolute left-0 right-0 top-14 z-20 border-b bg-white md:hidden"
        >
          <nav className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? `${linkBase} bg-slate-900 text-white`
                      : `${linkBase} text-slate-700 hover:bg-slate-100`
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}