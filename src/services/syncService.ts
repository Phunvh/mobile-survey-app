import { db } from '../db/surveyDb';
import type { CampusInspection, SyncQueueItem } from '../types/survey';
import { NativeService } from './nativeService';

type NetworkCallback = (isOnline: boolean) => void;
type SyncCallback = (syncedCount: number, remainingCount: number) => void;

class SyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private networkListeners: Set<NetworkCallback> = new Set();
  private syncListeners: Set<SyncCallback> = new Set();
  private isSyncing: boolean = false;
  private backendUrl: string = '';

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen via Capacitor Native Bridge and browser events
      NativeService.onNetworkChange((connected) => {
        if (connected) {
          this.handleOnline();
        } else {
          this.handleOffline();
        }
      });

      // Saved API Endpoint
      const savedApi = localStorage.getItem('CAMPUS_API_ENDPOINT');
      this.backendUrl = savedApi || '/api';

      // Auto periodic background sync check every 25 seconds
      setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.syncOutbox();
        }
      }, 25000);
    }
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public setBackendUrl(url: string) {
    this.backendUrl = url.replace(/\/$/, '');
    localStorage.setItem('CAMPUS_API_ENDPOINT', this.backendUrl);
  }

  public getBackendUrl(): string {
    return this.backendUrl;
  }

  public addNetworkListener(cb: NetworkCallback): () => void {
    this.networkListeners.add(cb);
    return () => this.networkListeners.delete(cb);
  }

  public addSyncListener(cb: SyncCallback): () => void {
    this.syncListeners.add(cb);
    return () => this.syncListeners.delete(cb);
  }

  private handleOnline() {
    this.isOnline = true;
    this.notifyNetworkListeners();
    console.log('[SyncService] Kết nối mạng trở lại (Online). Đang kích hoạt đồng bộ hàng đợi ngoại tuyến...');
    this.syncOutbox();
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyNetworkListeners();
    console.log('[SyncService] Thiết bị ngoại tuyến (Offline). Toàn bộ phiếu kiểm tra sẽ lưu cục bộ trong IndexedDB.');
  }

  private notifyNetworkListeners() {
    this.networkListeners.forEach(cb => cb(this.isOnline));
  }

  private notifySyncListeners(synced: number, remaining: number) {
    this.syncListeners.forEach(cb => cb(synced, remaining));
  }

  // 1. Lưu phiếu kiểm tra vào IndexedDB và xếp vào hàng đợi Outbox
  public async submitInspection(inspection: CampusInspection): Promise<{ savedOffline: boolean; synced: boolean }> {
    // Luôn ghi ngay vào IndexedDB (Ưu tiên ngoại tuyến)
    await db.inspections.put(inspection);

    // Đưa vào hàng đợi đồng bộ
    const queueItem: SyncQueueItem = {
      id: inspection.id,
      inspection,
      retryCount: 0,
      createdAt: new Date().toISOString()
    };
    await db.syncQueue.put(queueItem);

    // Nếu đang có mạng, thử gửi ngay lập tức lên server
    if (this.isOnline) {
      const synced = await this.syncSingle(queueItem);
      return { savedOffline: true, synced };
    }

    return { savedOffline: true, synced: false };
  }

  // 2. Gửi một phiếu đơn lẻ lên máy chủ
  private async syncSingle(item: SyncQueueItem): Promise<boolean> {
    try {
      const endpoint = `${this.backendUrl}/inspections/submit`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.inspection),
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      // Đánh dấu đã đồng bộ trong IndexedDB
      await db.inspections.update(item.id, {
        syncStatus: 'synced',
        syncedAt: new Date().toISOString()
      });

      // Xóa khỏi hàng đợi outbox
      await db.syncQueue.delete(item.id);
      return true;
    } catch (err: any) {
      console.warn(`[SyncService] Lỗi khi gửi phiếu ${item.id}:`, err?.message || err);
      await db.syncQueue.update(item.id, {
        retryCount: item.retryCount + 1,
        lastError: err?.message || 'Không thể kết nối đến máy chủ API'
      });
      return false;
    }
  }

  // 3. Tự động đồng bộ toàn bộ phiếu trong hàng đợi Outbox
  public async syncOutbox(): Promise<{ synced: number; remaining: number }> {
    if (this.isSyncing) {
      const remaining = await db.syncQueue.count();
      return { synced: 0, remaining };
    }

    this.isSyncing = true;
    let syncedCount = 0;

    try {
      const queue = await db.syncQueue.toArray();
      if (queue.length === 0) {
        this.isSyncing = false;
        return { synced: 0, remaining: 0 };
      }

      console.log(`[SyncService] Phát hiện ${queue.length} phiếu trong hàng đợi ngoại tuyến. Đang đồng bộ...`);

      for (const item of queue) {
        const ok = await this.syncSingle(item);
        if (ok) syncedCount++;
      }

      const remaining = await db.syncQueue.count();
      this.notifySyncListeners(syncedCount, remaining);
      return { synced: syncedCount, remaining };
    } finally {
      this.isSyncing = false;
    }
  }

  // Thống kê nhanh từ IndexedDB
  public async getLocalStats() {
    const total = await db.inspections.count();
    const pending = await db.syncQueue.count();
    const synced = await db.inspections.where('syncStatus').equals('synced').count();
    return {
      total,
      pending,
      synced,
      isOnline: this.isOnline
    };
  }
}

export const syncService = new SyncService();
