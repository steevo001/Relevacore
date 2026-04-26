const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'relevacore.db');

let db = null;
let initPromise = null;

async function initialize() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  return db;
}

function getDbSync() {
  return db;
}

async function getDb() {
  if (db) return db;
  if (!initPromise) {
    initPromise = initialize();
  }
  return initPromise;
}

function saveDb() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Failed to save database:', err);
    }
  }
}

// Helper: run a query and return all rows as objects
function all(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: run a query and return the first row as object
function get(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

// Helper: run an INSERT/UPDATE/DELETE and return changes info
function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  const changes = db.getRowsModified();
  // Get last insert ID
  const lastId = all("SELECT last_insert_rowid() as id");
  saveDb(); // Auto-save after writes
  return { changes, lastInsertRowid: lastId[0]?.id || 0 };
}

// Helper: execute raw SQL (for schema etc)
function exec(sql) {
  if (!db) throw new Error('Database not initialized');
  db.exec(sql);
  saveDb();
}

// Save on process exit
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

module.exports = { getDb, getDbSync, saveDb, all, get, run, exec };
