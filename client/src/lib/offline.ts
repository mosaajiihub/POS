/**
 * Offline Functionality Utilities
 * Handles offline data storage and synchronization
 */

// IndexedDB database name and version
const DB_NAME = 'MosaajiiPOS';
const DB_VERSION = 1;

// Object store names
const STORES = {
  OFFLINE_TRANSACTIONS: 'offlineTransactions',
  CACHED_PRODUCTS: 'cachedProducts',
  CACHED_CUSTOMERS: 'cachedCustomers',
  CACHED_CATEGORIES: 'cachedCategories',
  SYNC_QUEUE: 'syncQueue',
} as const;

// Initialize IndexedDB
export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains(STORES.OFFLINE_TRANSACTIONS)) {
        const transactionStore = db.createObjectStore(STORES.OFFLINE_TRANSACTIONS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
        transactionStore.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CACHED_PRODUCTS)) {
        const productStore = db.createObjectStore(STORES.CACHED_PRODUCTS, {
          keyPath: 'id',
        });
        productStore.createIndex('category', 'categoryId', { unique: false });
        productStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CACHED_CUSTOMERS)) {
        const customerStore = db.createObjectStore(STORES.CACHED_CUSTOMERS, {
          keyPath: 'id',
        });
        customerStore.createIndex('email', 'email', { unique: false });
        customerStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.CACHED_CATEGORIES)) {
        db.createObjectStore(STORES.CACHED_CATEGORIES, {
          keyPath: 'id',
        });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
      }
    };
  });
};

// Generic IndexedDB operations
export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    this.db = await initOfflineDB();
  }

  async add<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

// Transaction types
export interface OfflineTransaction {
  id?: number;
  data: any;
  timestamp: number;
  synced: boolean;
  retryCount: number;
  type: 'sale' | 'refund' | 'void';
}

export interface SyncQueueItem {
  id?: number;
  type: 'transaction' | 'product' | 'customer';
  action: 'create' | 'update' | 'delete';
  data: any;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

// Offline transaction management
export class OfflineTransactionManager {
  private storage = offlineStorage;

  async saveTransaction(transactionData: any, type: OfflineTransaction['type'] = 'sale'): Promise<void> {
    const offlineTransaction: OfflineTransaction = {
      data: transactionData,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0,
      type,
    };

    await this.storage.add(STORES.OFFLINE_TRANSACTIONS, offlineTransaction);
    
    // Register for background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('offline-transactions');
    }
  }

  async getOfflineTransactions(): Promise<OfflineTransaction[]> {
    return this.storage.getAll<OfflineTransaction>(STORES.OFFLINE_TRANSACTIONS);
  }

  async markTransactionSynced(id: number): Promise<void> {
    const transaction = await this.storage.get<OfflineTransaction>(STORES.OFFLINE_TRANSACTIONS, id);
    if (transaction) {
      transaction.synced = true;
      await this.storage.put(STORES.OFFLINE_TRANSACTIONS, transaction);
    }
  }

  async removeTransaction(id: number): Promise<void> {
    await this.storage.delete(STORES.OFFLINE_TRANSACTIONS, id);
  }

  async getPendingTransactions(): Promise<OfflineTransaction[]> {
    const allTransactions = await this.getOfflineTransactions();
    return allTransactions.filter(t => !t.synced);
  }
}

// Cache management for offline data
export class OfflineCacheManager {
  private storage = offlineStorage;

  async cacheProducts(products: any[]): Promise<void> {
    const timestamp = Date.now();
    const productsWithTimestamp = products.map(product => ({
      ...product,
      lastUpdated: timestamp,
    }));

    // Clear existing cache and add new data
    await this.storage.clear(STORES.CACHED_PRODUCTS);
    
    for (const product of productsWithTimestamp) {
      await this.storage.put(STORES.CACHED_PRODUCTS, product);
    }
  }

  async getCachedProducts(): Promise<any[]> {
    return this.storage.getAll(STORES.CACHED_PRODUCTS);
  }

  async cacheCustomers(customers: any[]): Promise<void> {
    const timestamp = Date.now();
    const customersWithTimestamp = customers.map(customer => ({
      ...customer,
      lastUpdated: timestamp,
    }));

    await this.storage.clear(STORES.CACHED_CUSTOMERS);
    
    for (const customer of customersWithTimestamp) {
      await this.storage.put(STORES.CACHED_CUSTOMERS, customer);
    }
  }

  async getCachedCustomers(): Promise<any[]> {
    return this.storage.getAll(STORES.CACHED_CUSTOMERS);
  }

  async cacheCategories(categories: any[]): Promise<void> {
    await this.storage.clear(STORES.CACHED_CATEGORIES);
    
    for (const category of categories) {
      await this.storage.put(STORES.CACHED_CATEGORIES, category);
    }
  }

  async getCachedCategories(): Promise<any[]> {
    return this.storage.getAll(STORES.CACHED_CATEGORIES);
  }

  async isCacheStale(storeName: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    const items = await this.storage.getAll(storeName);
    if (items.length === 0) return true;

    const oldestItem = items.reduce((oldest, item) => {
      return item.lastUpdated < oldest.lastUpdated ? item : oldest;
    });

    return Date.now() - oldestItem.lastUpdated > maxAge;
  }
}

// Network status management
export class NetworkManager {
  private listeners: Array<(isOnline: boolean) => void> = [];
  private _isOnline = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => {
      this._isOnline = true;
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      this._isOnline = false;
      this.notifyListeners(false);
    });
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  addListener(callback: (isOnline: boolean) => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: (isOnline: boolean) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(isOnline: boolean): void {
    this.listeners.forEach(listener => listener(isOnline));
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instances
export const offlineTransactionManager = new OfflineTransactionManager();
export const offlineCacheManager = new OfflineCacheManager();
export const networkManager = new NetworkManager();

// React hooks for offline functionality
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = React.useState(networkManager.isOnline);

  React.useEffect(() => {
    const handleStatusChange = (online: boolean) => setIsOnline(online);
    
    networkManager.addListener(handleStatusChange);
    
    return () => {
      networkManager.removeListener(handleStatusChange);
    };
  }, []);

  return isOnline;
};

export const useOfflineTransactions = () => {
  const [pendingCount, setPendingCount] = React.useState(0);

  const updatePendingCount = async () => {
    const pending = await offlineTransactionManager.getPendingTransactions();
    setPendingCount(pending.length);
  };

  React.useEffect(() => {
    updatePendingCount();
    
    // Update count when network status changes
    const handleNetworkChange = () => {
      updatePendingCount();
    };
    
    networkManager.addListener(handleNetworkChange);
    
    return () => {
      networkManager.removeListener(handleNetworkChange);
    };
  }, []);

  return {
    pendingCount,
    refreshCount: updatePendingCount,
  };
};

// Import React for hooks
import React from 'react';