'use client';

import Image from 'next/image';

export function MobileTopbar() {
  return (
    <header className="bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800/50 shadow-[0_4px_10px_rgba(0,0,0,0.2)] sticky top-0 w-full z-50 flex justify-between items-center px-6 h-16 md:hidden">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-violet-400 bg-clip-text text-transparent font-display">
          Fahad AI System
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all duration-200 p-2 rounded-full active:scale-95 transition-transform">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all duration-200 p-2 rounded-full active:scale-95 transition-transform">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <Image
          alt="User profile"
          className="w-8 h-8 rounded-full border border-slate-800/50"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_NM0w7M4dkgxe1Wa9XDkZ_MF0zv68UC4o58iRuNJYccRoqyoyQw92DQJRbbyJL6X1IzD7xFApbXefmuSpk5AOsY8EiO8dzlMnLAStF7ZKZEiYCxJdF4cxBVMTqcCT2QENh-MwegKhyL6o3GV3mzB4vr4Pma3yJ8RXmIosDSo2JvQANDoJ7MFEfgs3xXYM9adLdiIjmwrmaJrrEVZEfw8cf6mRLrv2mpype9atdRPKtq38ehtIK4JbLo2Q8mtLt1RAlsYNGg2N8x4"
          width={32}
          height={32}
        />
      </div>
    </header>
  );
}
