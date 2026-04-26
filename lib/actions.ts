import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  increment, 
  runTransaction,
  writeBatch
} from "firebase/firestore";
import { db, auth as firebaseAuth } from "./firebase";
import { getCurrentUser as getLocalUser, clearSession, saveSession } from "./auth";

// Types for Firestore
export interface MedicineGroup {
  name: string;
  capacity: string | null;
  total_quantity: number;
  unit: string;
  low_stock_threshold: number;
  earliest_expiry: string;
}

export interface MedicineStock {
  id: string;
  barcode: string | null;
  name: string;
  capacity: string | null;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  expiry_date: string;
  image_url: string | null;
  show_on_dashboard: boolean;
}

// 0. Login & Logout
export async function login(emailOrUser: string, password: string) {
  const q = query(
    collection(db, "users"), 
    where("username", "==", emailOrUser), 
    where("password", "==", password)
  );
  
  const userSnapshot = await getDocs(q);
  
  if (userSnapshot.empty) {
    return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }

  const userDoc = userSnapshot.docs[0];
  const userData = { id: userDoc.id, ...userDoc.data() };
  
  saveSession(userData);
  return { success: true };
}

export async function logout() {
  clearSession();
}

export async function getCurrentUser() {
  return getLocalUser();
}

// Helper to log activity
async function logActivity(actionType: string, medicineName: string | null, lotId: string | null, details: any) {
  try {
    const user = getLocalUser();
    const username = user?.username || 'Admin';
    const uid = user?.id || null;

    await addDoc(collection(db, "activity_log"), {
      action_type: actionType,
      medicine_name: medicineName,
      lot_id: lotId,
      details: JSON.stringify(details),
      user_id: uid,
      username: username,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Logging failed:', err);
  }
}

// 1. Get Grouped Medicines (Dashboard)
export async function getGroupedMedicines(): Promise<MedicineGroup[]> {
  const q = query(collection(db, "Stock"), where("show_on_dashboard", "==", true));
  const snapshot = await getDocs(q);

  const groups: Record<string, MedicineGroup> = {};

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const key = `${data.name}-${data.capacity || ''}`;
    if (!groups[key]) {
      groups[key] = {
        name: data.name,
        capacity: data.capacity || null,
        total_quantity: 0,
        unit: data.unit,
        low_stock_threshold: data.low_stock_threshold,
        earliest_expiry: data.expiry_date
      };
    }
    groups[key].total_quantity += (data.quantity || 0);
    if (data.expiry_date < groups[key].earliest_expiry) {
      groups[key].earliest_expiry = data.expiry_date;
    }
  });

  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMedicineLotsByCapacity(name: string, capacity: string | null): Promise<MedicineStock[]> {
  const q = query(
    collection(db, "Stock"), 
    where("name", "==", name), 
    where("capacity", "==", capacity || null),
    orderBy("expiry_date", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MedicineStock));
}

// 2. Get Medicine details for a specific name (Manage)
export async function getMedicineLots(name: string): Promise<MedicineStock[]> {
  const q = query(
    collection(db, "Stock"), 
    where("name", "==", name), 
    orderBy("expiry_date", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MedicineStock));
}

// 3. Search by barcode or name
export async function searchMedicine(queryStr: string): Promise<MedicineStock[]> {
  if (!queryStr) {
    const q = query(collection(db, "Stock"), orderBy("expiry_date", "asc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MedicineStock));
  }

  // Exact Barcode Search
  const qBarcode = query(collection(db, "Stock"), where("barcode", "==", queryStr));
  const barcodeSnapshot = await getDocs(qBarcode);
  if (!barcodeSnapshot.empty) {
    return barcodeSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MedicineStock));
  }
  
  // Name Search (Prefix match)
  const qName = query(
    collection(db, "Stock"),
    where("name", ">=", queryStr),
    where("name", "<=", queryStr + "\uf8ff")
  );
  const snapshot = await getDocs(qName);
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as MedicineStock));
}

// 4. Add/Update Stock Logic
export async function addMedicineStock(data: {
  barcode?: string;
  name: string;
  capacity?: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  expiry_date: string;
  image_url?: string;
}) {
  const { barcode, name, capacity, quantity, unit, low_stock_threshold, expiry_date, image_url } = data;
  
  const q = query(
    collection(db, "Stock"),
    where("name", "==", name),
    where("expiry_date", "==", expiry_date),
    where("capacity", "==", capacity || null),
    limit(1)
  );
  const existingSnapshot = await getDocs(q);

  let finalId: string;
  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];
    await updateDoc(existingDoc.ref, {
      quantity: increment(quantity),
      barcode: barcode || existingDoc.data().barcode,
      unit: unit,
      low_stock_threshold: low_stock_threshold
    });
    finalId = existingDoc.id;
  } else {
    const docRef = await addDoc(collection(db, "Stock"), {
      barcode: barcode || null,
      name,
      capacity: capacity || null,
      quantity,
      unit,
      low_stock_threshold,
      expiry_date,
      image_url: image_url || null,
      show_on_dashboard: true
    });
    finalId = docRef.id;
  }

  await logActivity('ADD', name, finalId, { quantity, unit, expiry_date });
}

// 5. Dispense Medicine
export async function dispenseMedicine(id: string, dispenseQuantity: number, note: string = '') {
  const docRef = doc(db, "Stock", id);
  
  await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(docRef);
    if (!sfDoc.exists()) throw new Error("Stock not found");
    const data = sfDoc.data()!;
    if (data.quantity < dispenseQuantity) throw new Error("Insufficient stock");

    transaction.update(docRef, {
      quantity: increment(-dispenseQuantity)
    });
  });

  const finalDoc = await getDoc(docRef);
  const data = finalDoc.data()!;
  await logActivity('DISPENSE', data.name, id, { quantity: dispenseQuantity, unit: data.unit, note });
}

// 6. Edit Lot
export async function editLot(id: string, data: {
  name: string;
  barcode: string;
  capacity: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  expiry_date: string;
  image_url: string;
}) {
  const docRef = doc(db, "Stock", id);
  const oldDoc = await getDoc(docRef);
  const oldData = oldDoc.data();

  await updateDoc(docRef, {
    ...data,
    barcode: data.barcode || null,
    capacity: data.capacity || null,
    image_url: data.image_url || null,
    quantity: Number(data.quantity)
  });
  
  await logActivity('EDIT', data.name, id, { before: oldData, after: data });
}

// 8. Get distinct units
export async function getExistingUnits(): Promise<string[]> {
  const snapshot = await getDocs(collection(db, "Stock"));
  const units = new Set<string>();
  snapshot.forEach(docSnap => {
    const u = docSnap.data().unit;
    if (u) units.add(u);
  });
  return Array.from(units);
}

// 9. Toggle Dashboard Visibility
export async function toggleDashboardVisibility(id: string) {
  const docRef = doc(db, "Stock", id);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data()!;
  
  await updateDoc(docRef, {
    show_on_dashboard: !data.show_on_dashboard
  });

  await logActivity('TOGGLE', data.name, id, { visible: !data.show_on_dashboard });
}

// 10. Delete Lot
export async function deleteLot(id: string) {
  const docRef = doc(db, "Stock", id);
  const docSnap = await getDoc(docRef);
  const data = docSnap.data();

  await deleteDoc(docRef);

  if (data) {
    await logActivity('DELETE', data.name, id, { data });
  }
}

// 11. Get History
export async function getActivityLogs(type?: string, lotId?: string) {
  let q = query(collection(db, "activity_log"), orderBy("created_at", "desc"), limit(500));

  if (lotId) {
    q = query(q, where("lot_id", "==", lotId));
  }

  const snapshot = await getDocs(q);
  let logs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

  if (type) {
    if (type === 'DISPENSE') logs = logs.filter((l: any) => l.action_type === 'DISPENSE');
    else if (type === 'ADD') logs = logs.filter((l: any) => l.action_type === 'ADD');
    else if (type === 'EDIT_DELETE') {
       logs = logs.filter((l: any) => ['EDIT', 'DELETE', 'TOGGLE'].includes(l.action_type));
    }
  }

  return logs;
}



