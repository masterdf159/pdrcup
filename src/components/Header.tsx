'use client';
import { Trophy, LogIn } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';

const NAV = [
  { href: '/', label: 'Partidos' },
  { href: '/clasificaciones', label: 'Tablas' },
  { href: '/bracket', label: 'Llaves' },
  { href: '/mi-prediccion', label: 'Mi Predicción' },
  { href: '/mis-predicciones', label: 'Mis Predicciones', auth: true },
];

export default function Header() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-[#05070d]/70">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 group-hover:scale-105 transition-all duration-300">
              <Trophy className="w-5.5 h-5.5 text-[#1a1206]" strokeWidth={2.5} />
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-amber-400/20 blur-md -z-10 group-hover:bg-amber-400/30 transition-colors" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black tracking-tight leading-none">
              <span className="text-gold">PRD</span>
              <span className="text-white ml-1">CUP</span>
            </h1>
            <p className="text-[9px] text-gray-500 mt-0.5 tracking-[0.2em] uppercase font-medium">
              World Cup 2026 · AI
            </p>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 flex-1 justify-center overflow-x-auto">
          {NAV.map(item => {
            const active = pathname === item.href;
            const link = (
              <Link key={item.href} href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  active ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25' : 'text-gray-400 hover:text-white'
                }`}>
                {item.label}
              </Link>
            );
            // "Mis Predicciones" only shows when signed in.
            if (item.auth && !isSignedIn) return null;
            return link;
          })}
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-[#1a1206] text-xs font-bold hover:opacity-90 transition-opacity">
                <LogIn className="w-3.5 h-3.5" />Entrar
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}

