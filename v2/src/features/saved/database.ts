import { decodeWorkspace, type Workspace } from './model';

export const DATABASE_NAME = 'bunkmeter-attendance';
export class ConflictError extends Error {}
export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    let failed = false;
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => { if (failed) { request.result.close(); return; } request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => { failed = true; reject(request.error); };
    request.onblocked = () => { failed = true; reject(Error('Close other BunkMeter tabs and try again.')); };
  });
}
export function readWorkspace(db: IDBDatabase): Promise<Workspace | null> {
  return new Promise((resolve, reject) => {
    const request = db.transaction('records').objectStore('records').get('workspace');
    request.onsuccess = () => { try { resolve(request.result === undefined ? null : decodeWorkspace(request.result)); } catch (error) { reject(error); } };
    request.onerror = () => reject(request.error);
  });
}
/** Read/compare/write in ONE transaction: another tab cannot silently replace newer data. */
export function writeWorkspace(db: IDBDatabase, next: Workspace, expectedRevision: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('records', 'readwrite');
    const store = transaction.objectStore('records');
    const request = store.get('workspace');
    let failure: unknown;
    request.onsuccess = () => {
      try {
        const previous = request.result === undefined ? null : decodeWorkspace(request.result);
        if ((previous?.revision ?? '') !== expectedRevision) throw new ConflictError('Another tab updated your saved attendance.');
        store.put(decodeWorkspace(next), 'workspace');
      } catch (error) { failure = error; transaction.abort(); }
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(failure ?? transaction.error ?? Error('Saving was interrupted.'));
    transaction.onerror = () => { failure ??= transaction.error; };
  });
}
