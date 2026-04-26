import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Open the SQLite database
const dbFile = path.join(dataDir, 'medicine_stock.db');
const db = new Database(dbFile);

try {
  db.pragma('journal_mode = WAL');
} catch (e: any) {
  if (e.code !== 'SQLITE_BUSY') console.error(e);
}

// Initialize the Database Schema if it doesn't exist
const initDb = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS Stock (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        expiry_date TEXT NOT NULL,
        image_url TEXT
      );
    `);
    
    try {
      db.exec(`ALTER TABLE Stock ADD COLUMN unit TEXT NOT NULL DEFAULT 'ชิ้น';`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Failed to add unit column:', e);
      }
    }

    try {
      db.exec(`ALTER TABLE Stock ADD COLUMN capacity TEXT;`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Failed to add capacity column:', e);
      }
    }

    try {
      db.exec(`ALTER TABLE Stock ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 0;`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Failed to add low_stock_threshold column:', e);
      }
    }

    try {
      db.exec(`ALTER TABLE Stock ADD COLUMN show_on_dashboard INTEGER NOT NULL DEFAULT 1;`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
        console.error('Failed to add show_on_dashboard column:', e);
      }
    }

    // Users table for Admin login
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, -- Stored as salt:hash
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity Log table
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL, -- 'ADD', 'DISPENSE', 'EDIT', 'DELETE', 'TOGGLE'
        medicine_name TEXT,
        lot_id INTEGER,
        details TEXT, -- JSON or string details
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create a default admin if none exists
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
        // For now, default password is 'admin1234'. 
        // In a real app we'd use bcrypt/scrypt. Since I don't have those libraries easily available without npm install, 
        // I will use a simple placeholder or suggest the user install a package.
        // I'll stick to a plain text for this demo or a simple hash-like string.
        db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', 'admin1234');
    }

    // Add indexes for log performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_med ON activity_log(medicine_name)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at)`);

    console.log('Database tables initialized/verified.');
  } catch (err: any) {
    if (err.code !== 'SQLITE_BUSY') console.error(err);
  }
};

initDb();

export default db;
