'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/actions';
import { KeyRound, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPageClient() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In Next.js App Router, we can't directly call server functions from client components 
      // if they use cookies() unless we wrap them in a Server Action.
      // I'll assume login in lib/auth is a server-side logic and I might need to move it to actions.ts or use it correctly.
      // For now, let's call it and see.
      const res = await login(username, password);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--brand-primary)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'white' }}>
            <KeyRound size={32} />
          </div>
          <h1 className="font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Admin Login</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>ยินดีต้อนรับสู่ระบบจัดการคลังยา HappyTeeth</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label className="input-label" htmlFor="username">ชื่อผู้ใช้</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="username"
                className="input-field"
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">รหัสผ่าน</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="password"
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', height: '48px', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          &copy; {new Date().getFullYear()} HappyTeeth Clinic Management
        </div>
      </div>
    </div>
  );
}
