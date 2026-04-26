'use client';

import { useState, useEffect } from 'react';
import { History, PackagePlus, FileEdit, ArrowRightLeft } from 'lucide-react';
import { getActivityLogs } from '@/lib/actions';

export interface ActivityLog {
  id: string;
  action_type: string;
  medicine_name: string | null;
  lot_id: string | null;
  details: string;
  username: string;
  created_at: string;
}

export default function HistoryClient({ logs: initialLogs }: { logs: ActivityLog[] }) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [loading, setLoading] = useState(initialLogs.length === 0);
  const [activeTab, setActiveTab] = useState<'DISPENSE' | 'ADD' | 'EDIT_DELETE'>('DISPENSE');

  useEffect(() => {
    async function fetchData() {
      const data = await getActivityLogs();
      setLogs(data as ActivityLog[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (activeTab === 'DISPENSE') return log.action_type === 'DISPENSE';
    if (activeTab === 'ADD') return log.action_type === 'ADD';
    if (activeTab === 'EDIT_DELETE') return ['EDIT', 'DELETE', 'TOGGLE'].includes(log.action_type);
    return false;
  });

  const getActionBadge = (type: string) => {
    switch (type) {
      case 'DISPENSE': return <span style={{ background: '#dcfce7', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>เบิกยา</span>;
      case 'ADD': return <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>เพิ่มสต็อก</span>;
      case 'EDIT': return <span style={{ background: '#fef9c3', color: '#854d0e', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>แก้ไข</span>;
      case 'DELETE': return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>ลบออก</span>;
      case 'TOGGLE': return <span style={{ background: '#f3f4f6', color: '#374151', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>เปิด/ปิด Dashboard</span>;
      default: return type;
    }
  };

  const renderDetails = (log: ActivityLog) => {
    try {
      const details = JSON.parse(log.details);
      if (log.action_type === 'DISPENSE') {
        return <span>{details.quantity} {details.unit}</span>;
      }
      if (log.action_type === 'ADD') {
        return <span>เพิ่ม {details.quantity} {details.unit} (หมดอายุ: {new Date(details.expiry_date).toLocaleDateString()})</span>;
      }
      if (log.action_type === 'EDIT') {
        return <span>แก้ไขรายละเอียด (Lot #{log.lot_id})</span>;
      }
      if (log.action_type === 'DELETE') {
        return <span>ลบยา {log.medicine_name} (Lot #{log.lot_id})</span>;
      }
      if (log.action_type === 'TOGGLE') {
        return <span>{details.visible ? 'แสดง' : 'ซ่อน'} ใน Dashboard</span>;
      }
      return log.details;
    } catch {
      return log.details;
    }
  };

  return (
    <div className="container page-enter" style={{ maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-bold text-3xl text-brand flex items-center gap-3">
          <History size={32} /> ประวัติการดำเนินการ (Activity Log)
        </h1>
        <p className="text-muted">บันทึกประวัติการเบิกยา และการปรับปรุงสต็อกทั้งหมดในระบบ</p>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: '0.5rem', marginBottom: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xl)', display: 'inline-flex', gap: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('DISPENSE')}
          className="btn" 
          style={{ 
            background: activeTab === 'DISPENSE' ? 'var(--bg-secondary)' : 'transparent',
            boxShadow: activeTab === 'DISPENSE' ? 'var(--shadow-sm)' : 'none',
            color: activeTab === 'DISPENSE' ? 'var(--brand-primary)' : 'var(--text-secondary)'
          }}
        >
          <ArrowRightLeft size={18} /> เบิกยา
        </button>
        <button 
          onClick={() => setActiveTab('ADD')}
          className="btn" 
          style={{ 
            background: activeTab === 'ADD' ? 'var(--bg-secondary)' : 'transparent',
            boxShadow: activeTab === 'ADD' ? 'var(--shadow-sm)' : 'none',
            color: activeTab === 'ADD' ? 'var(--brand-primary)' : 'var(--text-secondary)'
          }}
        >
          <PackagePlus size={18} /> เพิ่มสต็อก
        </button>
        <button 
          onClick={() => setActiveTab('EDIT_DELETE')}
          className="btn" 
          style={{ 
            background: activeTab === 'EDIT_DELETE' ? 'var(--bg-secondary)' : 'transparent',
            boxShadow: activeTab === 'EDIT_DELETE' ? 'var(--shadow-sm)' : 'none',
            color: activeTab === 'EDIT_DELETE' ? 'var(--brand-primary)' : 'var(--text-secondary)'
          }}
        >
          <FileEdit size={18} /> แก้ไข/ลบ
        </button>
      </div>

      {/* Log Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table className="table table-responsive">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>วัน-เวลา</th>
                <th style={{ width: '120px' }}>การกระทำ</th>
                <th>รายการยา</th>
                <th>รายละเอียด</th>
                {activeTab === 'DISPENSE' && <th>หมายเหตุ</th>}
                <th style={{ width: '120px' }}>ผู้ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'DISPENSE' ? 6 : 5} style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
                    ไม่พบประวัติในส่วนนี้
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  let note = '-';
                  try {
                    const details = JSON.parse(log.details);
                    if (details.note) note = details.note;
                  } catch {}
                  
                  return (
                    <tr key={log.id}>
                      <td data-label="วัน-เวลา" style={{ fontSize: '0.85rem' }}>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                      <td data-label="การกระทำ">{getActionBadge(log.action_type)}</td>
                      <td data-label="รายการยา" className="font-bold text-brand">{log.medicine_name || '-'}</td>
                      <td data-label="รายละเอียด" style={{ fontSize: '0.9rem' }}>{renderDetails(log)}</td>
                      {activeTab === 'DISPENSE' && (
                        <td data-label="หมายเหตุ" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: note !== '-' ? 'italic' : 'normal' }}>{note}</td>
                      )}
                      <td data-label="ผู้ดำเนินการ" style={{ fontWeight: 500 }}>{log.username || 'ระบบ'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
