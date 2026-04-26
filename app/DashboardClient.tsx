'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PackageSearch, AlertTriangle, X, Eye, ShieldAlert, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { MedicineGroup, MedicineStock, getMedicineLotsByCapacity, getGroupedMedicines } from '@/lib/actions';

const getExpiryStatus = (expiryStr: string) => {
  if (!expiryStr) return { label: '🟢', color: 'var(--success)', text: 'ปกติ', isExpired: false };
  
  // Parse manually to ensure local time representation (avoid UTC mismatch)
  const [y, m, d] = expiryStr.split('-').map(Number);
  const expiryDate = new Date(y, m - 1, d);
  
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Calculate diff in days (midnight to midnight)
  const diffDays = Math.round((expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: '⚫', color: '#666', text: 'หมดอายุแล้ว', isExpired: true };
  if (diffDays < 90) return { label: '🔴', color: 'var(--danger)', text: 'วิกฤต', isExpired: false };
  if (diffDays <= 180) return { label: '🟡', color: 'var(--warning)', text: 'เตือน', isExpired: false };
  return { label: '🟢', color: 'var(--success)', text: 'ปกติ', isExpired: false };
};

const renderStockStatus = (qty: number, threshold: number) => {
  if (qty <= 0) {
    return <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.875rem', background: 'var(--danger)', padding: '0.2rem 0.6rem', borderRadius: '1rem' }}>❌ หมดแล้ว</span>;
  }
  if (qty <= threshold) {
    return <span style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '1rem' }}>⚠️ ใกล้หมด (&le; {threshold})</span>;
  }
  return <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.875rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '1rem' }}>🟢 ปกติ (&gt; {threshold})</span>;
};

export default function DashboardClient({ medicines: initialMedicines }: { medicines: MedicineGroup[] }) {
  const [medicines, setMedicines] = useState<MedicineGroup[]>(initialMedicines);
  const [modalGroup, setModalGroup] = useState<MedicineGroup | null>(null);
  const [modalLots, setModalLots] = useState<MedicineStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(initialMedicines.length === 0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const data = await getGroupedMedicines();
      setMedicines(data);
      setDataLoading(false);
    }
    fetchData();
  }, []);

  // Collapsible section states
  const [showEmergency, setShowEmergency] = useState(true);
  const [showCritical, setShowCritical] = useState(true);
  const [showAll, setShowAll] = useState(true);

  const deadMedicines = medicines.filter(m => m.total_quantity <= 0 || getExpiryStatus(m.earliest_expiry).isExpired);
  const redMedicines = medicines.filter(m => getExpiryStatus(m.earliest_expiry).label === '🔴' && m.total_quantity > 0 && !getExpiryStatus(m.earliest_expiry).isExpired);

  const handleOpenModal = async (group: MedicineGroup) => {
    setModalGroup(group);
    setLoading(true);
    const lots = await getMedicineLotsByCapacity(group.name, group.capacity || '');
    setModalLots(lots);
    setLoading(false);
  };

  const closeModal = () => {
    setModalGroup(null);
    setModalLots([]);
  };

  const renderMobileListItem = (med: MedicineGroup, type: 'emergency' | 'critical' | 'all') => {
    return (
      <div 
        key={`${med.name}-${med.capacity || ''}`}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0.4rem 0.75rem',
          borderBottom: '1px solid var(--border-subtle)',
          minHeight: '40px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, overflow: 'hidden' }}>
          <span className="medicine-name-mobile-ultra" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{med.name}</span>
          {med.capacity && <span className="medicine-capacity-mobile" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>({med.capacity})</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {type === 'emergency' && (
            <span className={`status-pill status-pill-ultra ${med.total_quantity <= 0 ? 'status-empty' : 'status-expired'}`}>
               {med.total_quantity <= 0 ? 'หมดแล้ว' : 'หมดอายุแล้ว'}
            </span>
          )}
          {type === 'critical' && (
            <span className="status-pill status-pill-ultra status-warning">
               {new Date(med.earliest_expiry).toLocaleDateString('th-TH')}
            </span>
          )}
          {type === 'all' && (
            <span className="status-pill status-pill-ultra status-normal">
               {med.total_quantity} {med.unit}
            </span>
          )}
          <button 
            onClick={() => handleOpenModal(med)} 
            className="view-btn-mobile-small"
            style={{ width: '28px', height: '28px' }}
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderTableRows = (data: MedicineGroup[], type: 'emergency' | 'critical' | 'all') => {
    if (data.length === 0) {
      return (
        <tr>
          <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">ไม่พบข้อมูล</td>
        </tr>
      );
    }
    
    return data.map(med => {
      const status = getExpiryStatus(med.earliest_expiry);
      
      return (
        <tr key={`${med.name}-${med.capacity || ''}`} className="hide-on-mobile">
          <td data-label="ชื่อยา"><span className="font-bold text-brand">{med.name}</span></td>
          <td data-label="ปริมาณ">{med.capacity || '-'}</td>
          <td data-label="สถานะสต็อก">{renderStockStatus(med.total_quantity, med.low_stock_threshold)}</td>
          <td data-label="คงเหลือ" className={`font-bold ${med.total_quantity <= 0 ? 'text-danger' : ''}`}>{med.total_quantity}</td>
          <td data-label="หน่วย">{med.unit}</td>
          <td data-label="วันหมดอายุ" style={{ color: status.color, fontWeight: 'bold' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span>{status.label} {status.text}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                ({new Date(med.earliest_expiry).toLocaleDateString('th-TH')})
              </span>
            </div>
          </td>
          <td data-label="รายละเอียด" style={{ textAlign: 'right' }}>
            <button onClick={() => handleOpenModal(med)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', display: 'inline-flex', gap: '0.3rem', alignItems: 'center' }}>
              <Eye size={14} /> ดูข้อมูล
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="container py-6 page-enter">
        {dataLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem', color: 'var(--brand-primary)' }}>
            <Loader2 size={48} className="animate-spin" />
            <p className="text-muted">กำลังโหลดข้อมูลสต็อกยา...</p>
          </div>
        ) : (
          <>
        {/* 1. Emergency Section */}
        {deadMedicines.length > 0 && (
          <div style={{ marginBottom: '3rem', marginTop: '1rem' }}>
             <h2 
              className="font-bold text-lg mb-4 flex items-center gap-2" 
              style={{ color: 'var(--danger)', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setShowEmergency(!showEmergency)}
            >
              <ShieldAlert size={18} /> ตารางฉุกเฉิน
              <span style={{ marginLeft: 'auto' }}>{showEmergency ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
            </h2>
            {showEmergency && (
              <div className="card page-enter" style={{ padding: 0, overflow: 'hidden', border: '2px solid var(--danger)' }}>
                <div className="show-on-mobile">
                   {deadMedicines.map(med => renderMobileListItem(med, 'emergency'))}
                </div>
                <div className="hide-on-mobile" style={{ overflowX: 'auto' }}>
                  <table className="table table-ultra-compact table-responsive">
                    <thead className="hide-on-mobile">
                      <tr>
                        <th>ชื่อยา</th>
                        <th>ปริมาณ (Capacity)</th>
                        <th>สถานะสต็อก</th>
                        <th>จำนวนคงเหลือ</th>
                        <th>หน่วย</th>
                        <th>สถานะวันหมดอายุ</th>
                        <th style={{ textAlign: 'right' }}>รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderTableRows(deadMedicines, 'emergency')}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Critical Section */}
        {redMedicines.length > 0 && (
          <div style={{ marginBottom: '3rem', marginTop: '1rem' }}>
            <h2 
              className="font-bold text-lg mb-4 flex items-center gap-2" 
              style={{ color: 'var(--warning)', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setShowCritical(!showCritical)}
            >
              <AlertTriangle size={18} /> ยาใกล้หมดอายุ
              <span style={{ marginLeft: 'auto' }}>{showCritical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
            </h2>
            {showCritical && (
              <div className="card page-enter" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--warning)' }}>
                <div className="show-on-mobile">
                   {redMedicines.map(med => renderMobileListItem(med, 'critical'))}
                </div>
                <div className="hide-on-mobile" style={{ overflowX: 'auto' }}>
                  <table className="table table-ultra-compact table-responsive">
                    <thead className="hide-on-mobile">
                      <tr>
                        <th>ชื่อยา</th>
                        <th>ปริมาณ (Capacity)</th>
                        <th>สถานะสต็อก</th>
                        <th>จำนวนคงเหลือ</th>
                        <th>หน่วย</th>
                        <th>สถานะวันหมดอายุ</th>
                        <th style={{ textAlign: 'right' }}>รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renderTableRows(redMedicines, 'critical')}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. All Medicines Section */}
        <div style={{ marginBottom: '3rem', marginTop: '1rem' }}>
          <h2 
            className="font-bold text-xl mb-4 flex items-center gap-2 text-brand" 
            style={{ cursor: 'pointer', userSelect: 'none', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}
            onClick={() => setShowAll(!showAll)}
          >
            รายการยาทั้งหมด
          <span style={{ marginLeft: 'auto' }}>{showAll ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</span>
        </h2>
        {showAll && (
          <div className="card page-enter" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="show-on-mobile">
               {medicines.map(med => renderMobileListItem(med, 'all'))}
            </div>
            <div className="hide-on-mobile" style={{ overflowX: 'auto' }}>
              <table className="table table-ultra-compact table-responsive">
                    <thead className="hide-on-mobile">
                  <tr>
                    <th>ชื่อยา</th>
                    <th>ปริมาณ (Capacity)</th>
                    <th>สถานะสต็อก</th>
                    <th>จำนวนคงเหลือ</th>
                    <th>หน่วย</th>
                    <th>สถานะวันหมดอายุ</th>
                    <th style={{ textAlign: 'right' }}>รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows(medicines, 'all')}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
          </>
        )}
      </div>

      {/* Modals outside page-enter animation container to avoid CSS transform issues with fixed positioning */}
      {modalGroup && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="card modal-content page-enter" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button 
              className="btn btn-outline" 
              style={{ position: 'absolute', right: '1rem', top: '1rem', padding: '0.25rem', border: 'none', background: 'var(--bg-secondary)', zIndex: 10 }} 
              onClick={closeModal}
            >
              <X size={18} />
            </button>
            
            <h2 className="font-bold text-2xl mb-2 text-brand">{modalGroup.name} {modalGroup.capacity && <span className="text-muted text-lg">({modalGroup.capacity})</span>}</h2>
            <div className="mb-6 pb-4 border-b" style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <span className="text-muted" style={{ fontSize: '0.85rem', display: 'block' }}>จำนวนรวมในคลัง</span>
                <strong className="text-brand text-xl">{modalGroup.total_quantity}</strong> {modalGroup.unit}
              </div>
              <div>
                <span className="text-muted" style={{ fontSize: '0.85rem', display: 'block' }}>แจ้งเตือนเมื่อหลือต่ำกว่า</span>
                <strong>{modalGroup.low_stock_threshold}</strong> {modalGroup.unit}
              </div>
            </div>

            <h3 className="font-bold mb-4 flex items-center gap-2"><div style={{ width: 4, height: 18, background: 'var(--brand-primary)', borderRadius: 2 }}></div> ข้อมูลยารายล็อต (Lots)</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>กำลังดึงข้อมูล...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {modalLots.length === 0 && <p className="text-muted">ไม่พบล็อตใดๆเลย</p>}
                {modalLots.map(lot => {
                  const status = getExpiryStatus(lot.expiry_date);
                  return (
                    <div key={lot.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'var(--bg-tertiary)' }}>
                      {lot.image_url ? (
                        <div 
                          onClick={() => setZoomedImage(lot.image_url)}
                          style={{ width: 140, height: 140, borderRadius: '8px', background: `url(${lot.image_url}) center/cover`, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                          title="คลิกเพื่อขยายรูป"
                        />
                      ) : (
                        <div style={{ width: 140, height: 140, borderRadius: '8px', background: 'var(--bg-secondary)', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>ไม่มีรูปภาพ</div>
                      )}
                      
                      <div style={{ width: '100%', textAlign: 'center' }}>
                        <div className="font-bold mb-3 text-brand" style={{ fontSize: '1.2rem' }}>Lot #{lot.id}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', textAlign: 'left', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-subtle)', paddingBottom: '0.4rem' }}><span className="text-muted">ชื่อยา:</span> <strong>{lot.name}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-subtle)', paddingBottom: '0.4rem' }}><span className="text-muted">Capacity:</span> <strong>{lot.capacity || '-'}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-subtle)', paddingBottom: '0.4rem' }}><span className="text-muted">Barcode:</span> <strong>{lot.barcode || '-'}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-subtle)', paddingBottom: '0.4rem' }}><span className="text-muted">Quantity:</span> <strong className="text-brand">{lot.quantity} {lot.unit}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-subtle)', paddingBottom: '0.4rem' }}><span className="text-muted">Limit:</span> <strong>{lot.low_stock_threshold}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted var(--border-subtle)', paddingBottom: '0.4rem' }}><span className="text-muted">Expiry:</span> <strong style={{ color: status.color }}>{status.label} {status.text || new Date(lot.expiry_date).toLocaleDateString()}</strong></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <Link href={`/manage?search=${encodeURIComponent(modalGroup.name)}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}>
                ไปที่หน้าจัดการเพื่อแก้ไขยอด
              </Link>
            </div>
          </div>
        </div>
      )}

      {zoomedImage && (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={() => setZoomedImage(null)}>
          <button className="btn btn-outline" style={{ position: 'absolute', top: '2rem', right: '2rem', borderRadius: '50%', width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', border: 'none', zIndex: 1001 }} onClick={() => setZoomedImage(null)}><X size={20} /></button>
          <img src={zoomedImage} alt="Zoomed Medicine" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </>
  );
}
