'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Smile, BarChart3, PackageSearch, History } from 'lucide-react';
import UserMenu from './UserMenu';
import { getCurrentUser, clearSession } from '@/lib/auth';
import { logout } from '@/lib/actions';
import { useRouter, usePathname } from 'next/navigation';

export default function NavShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);

    // Redirect to login if not logged in and not already on login page
    if (!currentUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [pathname, router]);

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  if (loading) return null;

  return (
    <>
      {user && (
        <nav className="navbar" style={{ padding: '0.75rem 0' }}>
          <div className="container flex justify-between items-center" style={{ gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.5rem, 3vw, 3rem)' }}>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', color: 'var(--brand-primary)', letterSpacing: '1px', flexShrink: 0 }}>
                <Smile size={28} strokeWidth={2.5} /> <span style={{ fontFamily: 'sans-serif' }}>HAPPY<strong style={{ color: '#7b7b7b', fontWeight: 600 }}>TEETH</strong></span>
              </Link>
              <div className="nav-links" style={{ gap: 'clamp(0.5rem, 2vw, 1.5rem)' }}>
                <Link href="/" className="nav-link flex items-center gap-2">
                  <BarChart3 size={18} /> <span className="hidden-mobile">Dashboard</span>
                </Link>
                <Link href="/manage" className="nav-link flex items-center gap-2">
                  <PackageSearch size={18} /> <span className="hidden-mobile">Manage Specs</span>
                </Link>
                <Link href="/history" className="nav-link flex items-center gap-2">
                  <History size={18} /> <span className="hidden-mobile">History</span>
                </Link>
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <UserMenu username={user.username} onLogout={handleLogout} />
            </div>
          </div>
        </nav>
      )}
      
      <main className={user ? "container" : ""} style={{ padding: user ? '2rem 1rem' : '0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 480px) {
          .hidden-mobile { display: none; }
        }
      `}} />
    </>
  );
}
