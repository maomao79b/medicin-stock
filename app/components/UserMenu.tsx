'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, User } from 'lucide-react';

interface UserMenuProps {
  username: string;
  onLogout: () => void;
}

export default function UserMenu({ username, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 nav-link"
        style={{ 
          background: 'var(--bg-secondary)', 
          padding: '0.5rem 1rem', 
          borderRadius: '2rem',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ width: '24px', height: '24px', background: 'var(--brand-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <User size={14} />
        </div>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{username}</span>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div className="card page-enter" style={{ 
          position: 'absolute', 
          right: 0, 
          top: 'calc(100% + 0.5rem)', 
          minWidth: '160px', 
          padding: '0.5rem', 
          zIndex: 1000,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button 
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="flex items-center gap-2 w-full text-left nav-link"
            style={{ 
              color: 'var(--brand-danger)', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-md)',
              width: '100%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <LogOut size={18} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}
    </div>
  );
}
