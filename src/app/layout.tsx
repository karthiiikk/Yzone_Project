import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'DataGuard | Consent-Aware Data Sharing System',
  description: 'Enterprise-grade OAuth 2.0 consent management and privacy gateway. Empowering users to control, audit, and revoke third-party data access.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased min-h-screen">
        {/* ── Premium Navbar ── */}
        <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-3 no-underline">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                Data<span className="text-indigo-600">Guard</span>
              </span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <NavLink href="/" label="Dashboard" />
              <NavLink href="/developer" label="Developer Portal" />
              <NavLink href="/sandbox" label="Sandbox" accent />
            </nav>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="pt-24 pb-16 min-h-screen max-w-6xl mx-auto px-6">
          {children}
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-gray-200 py-6 px-6 text-center text-gray-500 text-sm">
          DataGuard — Consent-Aware Data Sharing System &nbsp;·&nbsp; OAuth 2.0 / OpenID Connect principles
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, label, accent }: { href: string; label: string; accent?: boolean }) {
  const baseClasses = "px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200";
  const normalClasses = "text-gray-600 hover:text-gray-900 hover:bg-gray-100";
  const accentClasses = "text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100";
  
  return (
    <Link href={href} className={`${baseClasses} ${accent ? accentClasses : normalClasses}`}>
      {label}
    </Link>
  );
}
