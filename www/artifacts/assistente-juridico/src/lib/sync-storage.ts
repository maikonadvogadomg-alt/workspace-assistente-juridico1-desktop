/**
 * SyncStorage — Persistência local robusta
 * Usa IndexedDB como armazenamento primário e localStorage como fallback.
 * Garante que nenhum dado é perdido mesmo sem conexão.
 */

const DB_NAME = "sk-juridico-v2";
const DB_VERSION = 2;
const STORE_NAME = "kv";
const DOC_STORE = "documents";
const HISTORY_STORE = "history";

let _db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(DOC_STORE)) {
        const s = db.createObjectStore(DOC_STORE, { keyPath: "id", autoIncrement: true });
        s.createIndex("updated", "updated", { unique: false });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        const s = db.createObjectStore(HISTORY_STORE, { keyPath: "id", autoIncrement: true });
        s.createIndex("created", "created", { unique: false });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB bloqueado por outra aba"));
  });
}

// ── KV Store (chave-valor genérico) ──────────────────────────────────────────

export const syncStorage = {
  async set(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    // Salva em localStorage imediatamente (síncrono)
    try { localStorage.setItem(key, serialized); } catch {}
    // Salva em IndexedDB de forma assíncrona
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ key, value: serialized, updated: Date.now() });
    } catch {}
  },

  async get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const db = await openDb();
      return new Promise<T | undefined>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => {
          if (req.result?.value) {
            try {
              resolve(JSON.parse(req.result.value) as T);
              return;
            } catch {}
          }
          // fallback localStorage
          const ls = localStorage.getItem(key);
          if (ls) {
            try { resolve(JSON.parse(ls) as T); return; } catch {}
          }
          resolve(defaultValue);
        };
        req.onerror = () => {
          const ls = localStorage.getItem(key);
          if (ls) { try { resolve(JSON.parse(ls) as T); return; } catch {} }
          resolve(defaultValue);
        };
      });
    } catch {
      const ls = localStorage.getItem(key);
      if (ls) { try { return JSON.parse(ls) as T; } catch {} }
      return defaultValue;
    }
  },

  // Versão síncrona (apenas localStorage)
  getSync<T = unknown>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = localStorage.getItem(key);
      if (item) return JSON.parse(item) as T;
    } catch {}
    return defaultValue;
  },

  setSync(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    // Dispara async save para IndexedDB em background
    this.set(key, value).catch(() => {});
  },

  async remove(key: string): Promise<void> {
    try { localStorage.removeItem(key); } catch {}
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
    } catch {}
  },

  async keys(): Promise<string[]> {
    try {
      const db = await openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).getAllKeys();
        req.onsuccess = () => resolve((req.result || []) as string[]);
        req.onerror = () => resolve(Object.keys(localStorage));
      });
    } catch {
      return Object.keys(localStorage);
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
    } catch {}
    // Mantém localStorage — pode ter configurações do sistema
  },
};

// ── Document Store (documentos locais offline) ────────────────────────────────

export interface LocalDocument {
  id?: number;
  titulo: string;
  conteudo: string;
  html?: string;
  tipo: string;
  updated: number;
  created: number;
}

export const documentStore = {
  async save(doc: Omit<LocalDocument, "id" | "created" | "updated">): Promise<number> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOC_STORE, "readwrite");
      const now = Date.now();
      const req = tx.objectStore(DOC_STORE).add({ ...doc, created: now, updated: now });
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  },

  async update(id: number, updates: Partial<LocalDocument>): Promise<void> {
    const db = await openDb();
    const existing = await this.get(id);
    if (!existing) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DOC_STORE, "readwrite");
      const req = tx.objectStore(DOC_STORE).put({ ...existing, ...updates, id, updated: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async get(id: number): Promise<LocalDocument | undefined> {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(DOC_STORE, "readonly");
      const req = tx.objectStore(DOC_STORE).get(id);
      req.onsuccess = () => resolve(req.result || undefined);
      req.onerror = () => resolve(undefined);
    });
  },

  async list(limit = 50): Promise<LocalDocument[]> {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(DOC_STORE, "readonly");
      const req = tx.objectStore(DOC_STORE).index("updated").getAll(undefined, limit);
      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => resolve([]);
    });
  },

  async delete(id: number): Promise<void> {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(DOC_STORE, "readwrite");
      tx.objectStore(DOC_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  },
};

// ── Histórico local (backup offline de gerações de IA) ────────────────────────

export interface LocalHistoryItem {
  id?: number;
  acao: string;
  entrada: string;
  resultado: string;
  modelo: string;
  created: number;
}

export const localHistory = {
  async add(item: Omit<LocalHistoryItem, "id" | "created">): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(HISTORY_STORE, "readwrite");
      tx.objectStore(HISTORY_STORE).add({ ...item, created: Date.now() });
    } catch {}
  },

  async list(limit = 100): Promise<LocalHistoryItem[]> {
    try {
      const db = await openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(HISTORY_STORE, "readonly");
        const req = tx.objectStore(HISTORY_STORE).index("created").getAll(undefined, limit);
        req.onsuccess = () => resolve((req.result || []).reverse());
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  async clear(): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(HISTORY_STORE, "readwrite");
      tx.objectStore(HISTORY_STORE).clear();
    } catch {}
  },
};

// Inicializa sincronização do localStorage para IndexedDB na inicialização
export async function initSyncStorage(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value) {
        const req = store.get(key);
        req.onsuccess = () => {
          if (!req.result) {
            store.put({ key, value, updated: Date.now() });
          }
        };
      }
    }
  } catch {}
}

export default syncStorage;
