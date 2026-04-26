"use client";

import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import type { MedicineStock } from '@/lib/actions';
import { addMedicineStock, dispenseMedicine, searchMedicine, editLot, toggleDashboardVisibility, deleteLot, getActivityLogs, getExistingUnits } from '@/lib/actions';
import { Search, Plus, Minus, FilePlus, Scan, X, Edit, Save, UploadCloud, Eye, EyeOff, Trash2, History, FileText, Barcode, Hash, ShieldAlert, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getExpiryStatus, compressImage, numericOnly, handleNumFocus } from '@/lib/utils';
import dynamic from 'next/dynamic';

const BarcodeScanner = dynamic(() => import('./BarcodeScanner'), { 
  ssr: false,
  loading: () => <div className="p-4 text-center text-muted">กำลังโหลดตัวสแกน...</div>
});

function ManageClientContent({ initialUnits = [] }: { initialUnits: string[] }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [data, setData] = useState<MedicineStock[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [availableUnits, setAvailableUnits] = useState<string[]>(initialUnits);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [scannerMode, setScannerMode] = useState<'search'|'add'|'edit'|null>(null);

  useEffect(() => {
    async function initData() {
      const results = await searchMedicine(initialSearch);
      setData(results);
      
      const dbUnits = await getExistingUnits();
      const defaultUnits = ['เม็ด', 'แคปซูล', 'ขวด', 'แผง', 'ซอง', 'หลอด'];
      setAvailableUnits(Array.from(new Set([...defaultUnits, ...dbUnits])));
      
      setLoading(false);
    }
    initData();
  }, [initialSearch]);


  // Edit Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editImageFile, setEditImageFile] = useState<File | null>(null);

  // Add Form State
  const [form, setForm] = useState({ name: '', barcode: '', capacity: '', quantity: 1, unit: 'เม็ด', low_stock_threshold: 1, expiry_date: '', image_url: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Filter State
  const [filterColor, setFilterColor] = useState<'ALL'|'RED'|'YELLOW'|'GREEN'|'EXPIRED'>('ALL');
  const [filterStock, setFilterStock] = useState<'ALL'|'LOW'|'OUT_OF_STOCK'>('ALL');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Dispense Modal State
  const [dispenseModal, setDispenseModal] = useState<{ id: string; name: string; maxQty: number } | null>(null);
  const [dispenseQty, setDispenseQty] = useState(1);
  const [dispenseNote, setDispenseNote] = useState('');
  const [dispenseError, setDispenseError] = useState('');

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Per-item History State
  const [historyModal, setHistoryModal] = useState<{ id: string; name: string; logs: any[] } | null>(null);

  const openHistoryModal = async (item: MedicineStock) => {
    setLoading(true);
    const logs = await getActivityLogs(undefined, item.id);
    setHistoryModal({ id: item.id, name: item.name, logs });
    setLoading(false);
  };


  const filteredData = data.filter(item => {
    if (filterColor !== 'ALL') {
      const st = getExpiryStatus(item.expiry_date);
      if (filterColor === 'EXPIRED' && st.label !== '⚫') return false;
      if (filterColor === 'RED' && st.label !== '🔴') return false;
      if (filterColor === 'YELLOW' && st.label !== '🟡') return false;
      if (filterColor === 'GREEN' && st.label !== '🟢') return false;
    }
    if (filterStock === 'LOW') {
      if (item.quantity > item.low_stock_threshold) return false;
    }
    if (filterStock === 'OUT_OF_STOCK') {
      if (item.quantity > 0) return false;
    }
    return true;
  });

  const handleToggleDashboard = async (id: string) => {
    await toggleDashboardVisibility(id);
    const results = await searchMedicine(search);
    setData(results);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const results = await searchMedicine(search);
    setData(results);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let finalImageUrl = form.image_url;
    try {
      if (imageFile) {
        // Compress and convert to Base64 (Data URI)
        finalImageUrl = await compressImage(imageFile);
      }

      await addMedicineStock({
        name: form.name.trim(),
        barcode: form.barcode.trim(),
        capacity: form.capacity.trim(),
        quantity: Math.max(1, Number(form.quantity)),
        unit: form.unit.trim(),
        low_stock_threshold: Math.max(1, Number(form.low_stock_threshold)),
        expiry_date: form.expiry_date,
        image_url: finalImageUrl.trim()
      });
      setShowAdd(false);
      
      // Refresh current search
      const results = await searchMedicine(search);
      setData(results);
      // Reset form
      setForm({ name: '', barcode: '', capacity: '', quantity: 1, unit: 'เม็ด', low_stock_threshold: 1, expiry_date: '', image_url: '' });
      setImageFile(null);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (err.message || 'Unknown error'));
    }
    setLoading(false);
  };

  const handleUnitChange = (val: string, setFn: (val: string) => void) => {
    if (val === '__add_custom__') {
      const customUnit = prompt("กรุณาพิมพ์หน่วยยาใหม่ (เช่น กระปุก, แกลลอน):");
      if (customUnit && customUnit.trim()) {
        const newUnit = customUnit.trim();
        if (!availableUnits.includes(newUnit)) {
          setAvailableUnits(prev => [...prev, newUnit]);
        }
        setFn(newUnit);
      }
    } else {
      setFn(val);
    }
  };

  const openDispenseModal = (item: MedicineStock) => {
    setDispenseModal({ id: item.id, name: item.name, maxQty: item.quantity });
    setDispenseQty(1);
    setDispenseNote('');
    setDispenseError('');
  };

  const handleDispenseConfirm = async () => {
    if (!dispenseModal) return;
    if (dispenseQty < 1 || dispenseQty > dispenseModal.maxQty) {
      setDispenseError(`จำนวนต้องอยู่ระหว่าง 1 - ${dispenseModal.maxQty}`);
      return;
    }
    try {
      await dispenseMedicine(dispenseModal.id, dispenseQty, dispenseNote);
      setDispenseModal(null);
      const results = await searchMedicine(search);
      setData(results);
    } catch (err: any) {
      setDispenseError(err.message || 'เบิกยาไม่สำเร็จ');
    }
  };


  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    await deleteLot(deleteConfirm.id);
    setDeleteConfirm(null);
    const results = await searchMedicine(search);
    setData(results);
  };

  const handleEditClick = (item: MedicineStock) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      barcode: item.barcode || '',
      capacity: item.capacity || '',
      quantity: item.quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold || 0,
      expiry_date: item.expiry_date,
      image_url: item.image_url || ''
    });
    setEditImageFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      let finalEditImageUrl = editForm.image_url;
      if (editImageFile) {
        // Compress and convert to Base64
        finalEditImageUrl = await compressImage(editImageFile);
      }

      await editLot(editingId, {
        name: editForm.name.trim(),
        barcode: editForm.barcode.trim(),
        capacity: editForm.capacity?.trim() || '',
        quantity: Number(editForm.quantity),
        unit: editForm.unit?.trim() || 'ชิ้น',
        low_stock_threshold: Number(editForm.low_stock_threshold) || 0,
        expiry_date: editForm.expiry_date,
        image_url: finalEditImageUrl.trim()
      });
      setEditingId(null);
      setEditImageFile(null);
      // Refresh current search
      const results = await searchMedicine(search);
      setData(results);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + (err.message || "Failed to save changes."));
    }
    setLoading(false);
  };

  const handleScan = useCallback(async (text: string) => {
    if (!scannerMode) return;
    
    if (scannerMode === 'search') {
      setScannerMode(null);
      setSearch(text);
      setLoading(true);
      const results = await searchMedicine(text);
      setData(results);
      setLoading(false);
    } else if (scannerMode === 'add') {
      setForm(prev => ({...prev, barcode: text}));
      setScannerMode(null);
    } else if (scannerMode === 'edit') {
      setEditForm(prev => ({...prev, barcode: text}));
      setScannerMode(null);
    }
  }, [scannerMode]);

  return (
    <>
      <div className="page-enter">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold mobile-title-compact">Manage Stock Lots</h1>
          <button className="btn btn-primary btn-compact-mobile" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? 'Cancel' : <><Plus size={18} /> Receive Stock</>}
          </button>
        </div>

        <div className="card mb-4" style={{ padding: '1rem' }}>
          <form className="flex mb-4 flex-mobile-col" style={{ gap: '0.5rem' }} onSubmit={handleSearch}>
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                className="input-field" 
                placeholder="🔍 Search medicine by name or barcode..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={{ width: '100%', paddingRight: search ? '2rem' : undefined }} 
              />
              {search && (
                <button 
                  type="button" 
                  onClick={() => setSearch('')} 
                  style={{ position: 'absolute', right: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Clear Search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary">Search</button>
            <button type="button" className="btn btn-outline" title="Scan Barcode" onClick={() => setScannerMode(scannerMode === 'search' ? null : 'search')}>
              {scannerMode === 'search' ? <X size={18} /> : <Scan size={18} />}
            </button>
          </form>
        </div>

        <div className="card mb-4 filters-row-mobile" style={{ display: 'flex', gap: '1rem', flexWrap: 'nowrap', alignItems: 'center' }}>
          <span className="font-bold text-sm">Filters:</span>
          <select className="input-field" style={{ width: 'auto' }} value={filterColor} onChange={e => setFilterColor(e.target.value as any)}>
            <option value="ALL">🗓️ All Expiry</option>
            <option value="GREEN">🟢 Safe (&gt;6m)</option>
            <option value="YELLOW">🟡 Warning (3-6m)</option>
            <option value="RED">🔴 Critical (&lt;3m)</option>
            <option value="EXPIRED">⚫ หมดอายุแล้ว</option>
          </select>
          <select className="input-field" style={{ width: 'auto' }} value={filterStock} onChange={e => setFilterStock(e.target.value as any)}>
            <option value="ALL">📦 All Stock</option>
            <option value="LOW">⚠️ Low Stock</option>
            <option value="OUT_OF_STOCK">❌ หมดสต็อก (0)</option>
          </select>
        </div>

        {scannerMode && (
          <div className="card mb-4 page-enter">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Scan Barcode</h2>
              <button className="btn btn-outline" onClick={() => setScannerMode(null)}><X size={16}/></button>
            </div>
            <BarcodeScanner onScan={handleScan} />
          </div>
        )}

        {showAdd && (
          <div className="card mb-4 page-enter">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><FilePlus size={18}/> Add New Lot</h2>
            <form className="grid sm:grid-cols-2 gap-4" onSubmit={handleAdd}>
              <div className="input-group">
                <label className="input-label">Name *</label>
                <input required className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Capacity (ปริมาณยา)</label>
                <input className="input-field" placeholder="e.g. 500mg, 10g" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">Barcode</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="input-field" placeholder="Optional" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} style={{ flex: 1 }} />
                  <button type="button" className="btn btn-outline" style={{ padding: '0 0.75rem' }} onClick={() => setScannerMode(scannerMode === 'add' ? null : 'add')}>
                    <Scan size={18} />
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Quantity & Unit *</label>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <input required type="number" min="1" className="input-field" value={form.quantity} onChange={e => setForm({...form, quantity: Number(e.target.value)})} onKeyDown={numericOnly} onFocus={handleNumFocus} style={{ flex: 1 }} />
                  <select className="input-field" value={form.unit} onChange={e => handleUnitChange(e.target.value, val => setForm({...form, unit: val}))} style={{ flex: 1 }}>
                    {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    <option value="__add_custom__">+ เพิ่มหน่วย...</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Low Stock Warning Limit</label>
                <input required type="number" min="1" className="input-field" value={form.low_stock_threshold} onChange={e => setForm({...form, low_stock_threshold: Math.max(1, Number(e.target.value) || 1)})} onKeyDown={numericOnly} onFocus={handleNumFocus} />
              </div>
              <div className="input-group">
                <label className="input-label">Expiry Date *</label>
                <input required type="date" className="input-field" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
              </div>
              <div className="input-group sm:col-span-2" style={{ gridColumn: 'span 2' }}>
                <label className="input-label">Medicine Image</label>
                <div className="upload-zone" style={{ position: 'relative' }}>
                  <input type="file" accept="image/*" onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setImageFile(e.target.files[0]);
                      setForm({...form, image_url: ''});
                    }
                  }} />
                  <UploadCloud size={24} className="upload-icon" />
                  <span className="upload-zone-text">
                    {imageFile ? imageFile.name : "Click or drag to upload an image"}
                  </span>
                  {imageFile && (
                    <button type="button" className="btn btn-outline" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.25rem', color: 'var(--danger)', zIndex: 10 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageFile(null); }} title="Remove File">
                      <X size={16} />
                    </button>
                  )}
                </div>
                {!imageFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span className="text-muted" style={{ fontSize: '0.875rem' }}>Or link URL:</span>
                    <input className="input-field" placeholder="https://" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} style={{ flex: 1 }} />
                    {form.image_url && (
                      <button type="button" className="btn btn-outline" style={{ padding: '0 0.5rem', color: 'var(--danger)' }} onClick={() => setForm({...form, image_url: ''})} title="Clear URL">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-success">Save Stock</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-muted text-center py-4">Loading...</p>
        ) : (
          <div className="table-container card" style={{ padding: 0 }}>
            <table className="table table-responsive">
              <thead>
                <tr>
                  <th>Name / Capacity</th>
                  <th>Barcode</th>
                  <th>Quantity</th>
                  <th>Limit</th>
                  <th>Expiry</th>
                  <th>Image</th>
                  <th style={{ textAlign: 'center' }}>Dashboard</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">No lots found matching filters.</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id}>
                      {editingId === item.id ? (
                        <td colSpan={8} style={{ padding: 0 }}>
                          <div className="edit-card-wrapper">
                            <div className="edit-grid">
                                <div>
                                    <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <FileText size={12} /> Name & Capacity
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <input className="input-field" style={{ border: '1px solid var(--border-subtle)' }} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" />
                                        <input className="input-field" style={{ border: '1px solid var(--border-subtle)' }} value={editForm.capacity || ''} onChange={e => setEditForm({...editForm, capacity: e.target.value})} placeholder="Capacity" />
                                    </div>
                                </div>
                                <div>
                                    <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Barcode size={12} /> Barcode
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <input className="input-field" value={editForm.barcode} onChange={e => setEditForm({...editForm, barcode: e.target.value})} placeholder="Barcode" style={{ flex: 1 }} />
                                        <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-primary)' }} onClick={() => setScannerMode(scannerMode === 'edit' ? null : 'edit')}>
                                            <Scan size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Hash size={12} /> Quantity & Unit
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <input type="number" min="0" className="input-field" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} style={{ flex: 1 }} />
                                        <select className="input-field" value={editForm.unit} onChange={e => handleUnitChange(e.target.value, val => setEditForm({...editForm, unit: val}))} style={{ flex: 1.2 }}>
                                            {availableUnits.map(u => <option key={u} value={u}>{u}</option>)}
                                            <option value="__add_custom__">+ หน่วย</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <ShieldAlert size={12} /> Limit
                                    </label>
                                    <input type="number" min="1" className="input-field" value={editForm.low_stock_threshold} onChange={e => setEditForm({...editForm, low_stock_threshold: Math.max(1, Number(e.target.value) || 1)})} style={{ width: '100%', border: '1px solid var(--border-subtle)' }} />
                                </div>
                                <div>
                                    <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Calendar size={12} /> Expiry
                                    </label>
                                    <input type="date" className="input-field" value={editForm.expiry_date} onChange={e => setEditForm({...editForm, expiry_date: e.target.value})} style={{ width: '100%', border: '1px solid var(--border-subtle)' }} />
                                </div>
                                <div>
                                    <label className="input-label" style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--brand-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <ImageIcon size={12} /> Image URL / Upload
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <input className="input-field" style={{ flex: 1, border: '1px solid var(--border-subtle)' }} value={editImageFile ? editImageFile.name : editForm.image_url} onChange={e => setEditForm({...editForm, image_url: e.target.value})} placeholder="URL..." disabled={!!editImageFile} />
                                        <div style={{ position: 'relative' }}>
                                            <input type="file" accept="image/*" onChange={e => e.target.files && setEditImageFile(e.target.files[0])} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                                            <button type="button" className="btn btn-outline" style={{ height: '100%', background: 'var(--bg-primary)' }}><UploadCloud size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="edit-footer">
                                <button className="btn btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                                <button className="btn btn-success" style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }} onClick={handleSaveEdit}>
                                  <Save size={16} /> Save Changes
                                </button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td data-label="ชื่อยา">
                            <div className="font-bold">{item.name}</div>
                            {item.capacity && <div className="text-muted" style={{ fontSize: '0.8rem' }}>{item.capacity}</div>}
                          </td>
                          <td data-label="บาร์โค้ด">
                            <div className="text-muted">{item.barcode || '-'}</div>
                          </td>
                          <td data-label="จำนวน">
                            {item.quantity <= 0 ? (
                               <span className="font-bold text-lg" style={{ color: 'var(--danger)', padding: '0.2rem 0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '1rem' }}>หมดแล้ว</span>
                            ) : (
                               <><span className={`font-bold text-lg ${item.quantity <= item.low_stock_threshold ? 'text-danger' : ''}`}>{item.quantity}</span> <span className="text-muted" style={{ fontSize: '0.875rem' }}>{item.unit}</span></>
                            )}
                          </td>
                          <td data-label="การแจ้งเตือน">
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>&le; {item.low_stock_threshold}</span>
                          </td>
                          <td data-label="วันหมดอายุ" style={{ color: getExpiryStatus(item.expiry_date).color, fontWeight: 'bold' }}>
                            {getExpiryStatus(item.expiry_date).label} {new Date(item.expiry_date).toLocaleDateString()}
                          </td>
                          <td data-label="รูปภาพ">
                            {item.image_url ? (
                              <div 
                                onClick={() => setZoomedImage(item.image_url)}
                                style={{ width: 40, height: 40, borderRadius: '4px', background: `url(${item.image_url}) center/cover`, cursor: 'pointer', border: '1px solid var(--border-color)', transition: 'transform 0.1s' }} 
                                onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                                onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                                title="คลิกเพื่อขยายรูป"
                              />
                            ) : (
                              <span className="text-muted" style={{ fontSize: '0.8rem' }}>No Image</span>
                            )}
                          </td>
                          <td data-label="แสดงผล" style={{ textAlign: 'center' }}>
                            <button 
                              className={`btn ${item.show_on_dashboard ? 'btn-success' : 'btn-outline'}`} 
                              onClick={() => handleToggleDashboard(item.id)} 
                              style={{ padding: '0.3rem 0.5rem' }}
                              title={item.show_on_dashboard ? 'แสดงใน Dashboard (กดเพื่อซ่อน)' : 'ซ่อนใน Dashboard (กดเพื่อแสดง)'}
                            >
                              {item.show_on_dashboard ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                          </td>
                          <td data-label="จัดการ" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button className="btn btn-outline" onClick={() => openHistoryModal(item)} style={{ padding: '0.4rem' }} title="ดูประวัติ">
                                <History size={16} />
                              </button>
                              <button className="btn btn-outline" onClick={() => handleEditClick(item)} style={{ padding: '0.4rem' }}>
                                <Edit size={16} /> Edit
                              </button>
                              <button className="btn btn-primary" onClick={() => openDispenseModal(item)} disabled={item.quantity <= 0} style={{ padding: '0.4rem', background: '#3b82f6' }}>
                                <Minus size={16} /> เบิกยา
                              </button>
                              <button className="btn btn-outline" onClick={() => setDeleteConfirm({ id: item.id, name: item.name })} style={{ padding: '0.4rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }} title="ลบรายการนี้">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="card modal-content page-enter" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 className="font-bold text-xl mb-2">ยืนยันการลบ</h2>
            <p className="text-muted mb-4">คุณต้องการลบ <strong className="text-brand">{deleteConfirm.name}</strong> (Lot #{deleteConfirm.id}) หรือไม่?</p>
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>ยกเลิก</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDeleteConfirm}>ลบถาวร</button>
            </div>
          </div>
        </div>
      )}

      {dispenseModal && (
        <div className="modal-overlay" onClick={() => setDispenseModal(null)}>
          <div className="card modal-content page-enter" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-outline" style={{ position: 'absolute', right: '1rem', top: '1rem', padding: '0.25rem', border: 'none' }} onClick={() => setDispenseModal(null)}><X size={18} /></button>
            
            <h2 className="font-bold text-xl mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Minus size={20} /> เบิกยา</h2>
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>กำลังเบิก: <strong className="text-brand">{dispenseModal.name}</strong></p>
            <p className="text-muted mb-4" style={{ fontSize: '0.85rem' }}>คงเหลือในคลัง: <strong>{dispenseModal.maxQty}</strong></p>
            
            <div className="input-group">
              <label className="input-label">จำนวนที่ต้องการเบิก</label>
              <input 
                type="number" 
                min="1" 
                max={dispenseModal.maxQty} 
                className="input-field" 
                value={dispenseQty} 
                onChange={e => { setDispenseQty(Number(e.target.value)); setDispenseError(''); }}
                onKeyDown={numericOnly}
                onFocus={handleNumFocus}
                autoFocus={true}
                style={{ fontSize: '1.25rem', textAlign: 'center', padding: '0.75rem' }}
              />
            </div>

            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label className="input-label">หมายเหตุ (ถ้ามี)</label>
              <textarea 
                className="input-field" 
                placeholder="เช่น เบิกให้คนไข้ X, ยาใกล้หมดอายุ..." 
                value={dispenseNote}
                onChange={e => setDispenseNote(e.target.value)}
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
            </div>
            
            {dispenseError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>{dispenseError}</p>}
            
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDispenseModal(null)}>ยกเลิก</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDispenseConfirm}>ยืนยันเบิกยา</button>
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

      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(null)}>
          <div className="card modal-content page-enter" style={{ maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-outline" style={{ position: 'absolute', right: '1rem', top: '1rem', padding: '0.25rem', border: 'none' }} onClick={() => setHistoryModal(null)}><X size={18} /></button>
            
            <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><History size={20} /> ประวัติของ: <span className="text-brand">{historyModal.name}</span> (Lot #{historyModal.id})</h2>
            
            <div className="table-container" style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
              <table className="table table-responsive" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-tertiary)' }}>
                    <th>วัน-เวลา</th>
                    <th>การกระทำ</th>
                    <th>ผู้ทำรายการ</th>
                    <th>รายละเอียด</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.logs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }} className="text-muted">ไม่พบประวัติการทำรายการ</td></tr>
                  ) : (
                    historyModal.logs.map((log: any) => {
                      let note = '-';
                      try {
                        const d = JSON.parse(log.details);
                        if (d.note) note = d.note;
                      } catch {}

                      return (
                        <tr key={log.id}>
                          <td data-label="วัน-เวลา" style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                          <td data-label="การกระทำ">
                            {log.action_type === 'DISPENSE' && <span style={{ color: '#dc2626', fontWeight: 600 }}>เบิกยา</span>}
                            {log.action_type === 'ADD' && <span style={{ color: '#16a34a', fontWeight: 600 }}>เพิ่มเข้า</span>}
                            {log.action_type === 'EDIT' && <span style={{ color: '#2563eb', fontWeight: 600 }}>แก้ไข</span>}
                            {log.action_type === 'DELETE' && <span style={{ color: '#ef4444', fontWeight: 600 }}>ลบ</span>}
                            {log.action_type === 'TOGGLE' && <span style={{ color: '#4b5563', fontWeight: 600 }}>Visibility</span>}
                          </td>
                          <td data-label="ผู้ทำรายการ">{log.username || 'ระบบ'}</td>
                          <td data-label="รายละเอียด">
                            {(() => {
                              try {
                                const d = JSON.parse(log.details);
                                if (log.action_type === 'DISPENSE') return `เบิกออก ${d.quantity} ${d.unit}`;
                                if (log.action_type === 'ADD') return `รับเข้า ${d.quantity} ${d.unit}`;
                                if (log.action_type === 'EDIT') return `แก้ไขข้อมูลยา`;
                                if (log.action_type === 'TOGGLE') return d.visible ? 'แสดงหน้า Dashboard' : 'ซ่อนจาก Dashboard';
                                return log.details;
                              } catch { return log.details; }
                            })()}
                          </td>
                          <td data-label="หมายเหตุ" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: note !== '-' ? 'italic' : 'normal' }}>
                            {note}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button className="btn btn-primary" style={{ minWidth: '120px' }} onClick={() => setHistoryModal(null)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ManageClient(props: any) {
  return (
    <Suspense fallback={<div className="container py-8 text-center text-muted"><Loader2 className="animate-spin mb-2 inline-block" /> กำลังโหลด...</div>}>
      <ManageClientContent {...props} />
    </Suspense>
  );
}
