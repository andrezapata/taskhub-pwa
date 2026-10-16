import { Injectable } from '@angular/core';
import { EntregaLocal, EstadoSincronizacion } from '../models/taskhub.models';

const DB_NAME = 'TaskHubPWA_DB';
const DB_VERSION = 1;
const STORE_NAME = 'entregas_locales';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no está disponible en este entorno'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('tareaId', 'tareaId', { unique: false });
          store.createIndex('estadoSincronizacion', 'estadoSincronizacion', { unique: false });
          store.createIndex('fechaRegistro', 'fechaRegistro', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Error al abrir la base de datos IndexedDB'));
      };
    });
  }

  async guardarEntregaLocal(entrega: Omit<EntregaLocal, 'id'>): Promise<EntregaLocal> {
    try {
      const db = await this.dbPromise;
      return new Promise<EntregaLocal>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const registroCompleto: Omit<EntregaLocal, 'id'> = {
          ...entrega,
          fechaRegistro: entrega.fechaRegistro || new Date().toISOString(),
          estadoSincronizacion: 'PENDIENTE',
          intentosSincronizacion: 0
        };

        const request = store.add(registroCompleto);

        request.onsuccess = () => {
          const id = request.result as number;
          resolve({ ...registroCompleto, id });
        };

        request.onerror = () => {
          reject(request.error || new Error('Error al persistir la entrega en IndexedDB'));
        };
      });
    } catch (err) {
      console.error('Fallo en guardarEntregaLocal:', err);
      throw err;
    }
  }

  async listarEntregas(): Promise<EntregaLocal[]> {
    try {
      const db = await this.dbPromise;
      return new Promise<EntregaLocal[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const list = (request.result as EntregaLocal[]) || [];
          // Ordenar de más reciente a más antiguo
          list.sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime());
          resolve(list);
        };

        request.onerror = () => {
          reject(request.error || new Error('Error al leer entregas de IndexedDB'));
        };
      });
    } catch (err) {
      console.error('Fallo en listarEntregas:', err);
      throw err;
    }
  }

  async obtenerEntrega(id: number): Promise<EntregaLocal | null> {
    try {
      const db = await this.dbPromise;
      return new Promise<EntregaLocal | null>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve((request.result as EntregaLocal) || null);
        };

        request.onerror = () => {
          reject(request.error || new Error('Error al consultar entrega'));
        };
      });
    } catch (err) {
      console.error('Fallo en obtenerEntrega:', err);
      throw err;
    }
  }

  async eliminarEntrega(id: number): Promise<boolean> {
    try {
      const db = await this.dbPromise;
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          reject(request.error || new Error('Error al eliminar entrega'));
        };
      });
    } catch (err) {
      console.error('Fallo en eliminarEntrega:', err);
      throw err;
    }
  }

  async contarPendientes(): Promise<number> {
    try {
      const entregas = await this.listarEntregas();
      return entregas.filter(e => e.estadoSincronizacion === 'PENDIENTE').length;
    } catch (err) {
      console.error('Fallo en contarPendientes:', err);
      return 0;
    }
  }

  async actualizarEstado(id: number, estado: EstadoSincronizacion, ultimoError?: string): Promise<boolean> {
    try {
      const db = await this.dbPromise;
      return new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
          const item = getReq.result as EntregaLocal;
          if (!item) {
            reject(new Error(`Entrega con id ${id} no encontrada`));
            return;
          }

          item.estadoSincronizacion = estado;
          item.intentosSincronizacion = (item.intentosSincronizacion || 0) + 1;
          if (ultimoError !== undefined) {
            item.ultimoError = ultimoError;
          }

          const putReq = store.put(item);
          putReq.onsuccess = () => resolve(true);
          putReq.onerror = () => reject(putReq.error || new Error('Error al actualizar registro'));
        };

        getReq.onerror = () => reject(getReq.error || new Error('Error al consultar para actualización'));
      });
    } catch (err) {
      console.error('Fallo en actualizarEstado:', err);
      throw err;
    }
  }
}
