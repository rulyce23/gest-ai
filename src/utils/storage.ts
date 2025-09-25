import type { GestureMapping, AppSettings } from '../types';
import { defaultGestureMappings } from './defaultMappings';

const DB_NAME = 'GestureAI';
const DB_VERSION = 1;
const MAPPINGS_STORE = 'gestureMappings';
const SETTINGS_STORE = 'appSettings';

class StorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create gesture mappings store
        if (!db.objectStoreNames.contains(MAPPINGS_STORE)) {
          const mappingsStore = db.createObjectStore(MAPPINGS_STORE, { keyPath: 'id' });
          mappingsStore.createIndex('name', 'name', { unique: false });
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  async getGestureMappings(): Promise<GestureMapping[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MAPPINGS_STORE], 'readonly');
      const store = transaction.objectStore(MAPPINGS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const mappings = request.result;
        if (mappings.length === 0) {
          // Initialize with default mappings
          this.saveGestureMappings(defaultGestureMappings).then(() => {
            resolve(defaultGestureMappings);
          });
        } else {
          resolve(mappings);
        }
      };
    });
  }

  async saveGestureMapping(mapping: GestureMapping): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MAPPINGS_STORE], 'readwrite');
      const store = transaction.objectStore(MAPPINGS_STORE);
      const request = store.put(mapping);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async saveGestureMappings(mappings: GestureMapping[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MAPPINGS_STORE], 'readwrite');
      const store = transaction.objectStore(MAPPINGS_STORE);

      // Clear existing mappings
      store.clear();

      let completed = 0;
      const total = mappings.length;

      if (total === 0) {
        resolve();
        return;
      }

      mappings.forEach(mapping => {
        const request = store.add(mapping);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
      });
    });
  }

  async getSettings(): Promise<Partial<AppSettings>> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('appSettings');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : {});
      };
    });
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SETTINGS_STORE], 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.put({ key: 'appSettings', value: settings });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async exportData(): Promise<{ mappings: GestureMapping[]; settings: Partial<AppSettings> }> {
    const [mappings, settings] = await Promise.all([
      this.getGestureMappings(),
      this.getSettings()
    ]);

    return { mappings, settings };
  }

  async importData(data: { mappings?: GestureMapping[]; settings?: Partial<AppSettings> }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (data.mappings) {
      promises.push(this.saveGestureMappings(data.mappings));
    }

    if (data.settings) {
      promises.push(this.saveSettings(data.settings));
    }

    await Promise.all(promises);
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MAPPINGS_STORE, SETTINGS_STORE], 'readwrite');
      
      const mappingsStore = transaction.objectStore(MAPPINGS_STORE);
      const settingsStore = transaction.objectStore(SETTINGS_STORE);

      const clearMappings = mappingsStore.clear();
      const clearSettings = settingsStore.clear();

      let completed = 0;

      const checkComplete = () => {
        completed++;
        if (completed === 2) resolve();
      };

      clearMappings.onerror = () => reject(clearMappings.error);
      clearMappings.onsuccess = checkComplete;

      clearSettings.onerror = () => reject(clearSettings.error);
      clearSettings.onsuccess = checkComplete;
    });
  }
}

export const storageService = new StorageService();
