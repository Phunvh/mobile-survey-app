import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { syncService } from '../services/syncService';
import { db } from '../db/surveyDb';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(syncService.getOnlineStatus());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const updatePendingCount = async () => {
    try {
      const count = await db.syncQueue.count();
      setPendingCount(count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    updatePendingCount();

    const unsubNetwork = syncService.addNetworkListener((online) => {
      setIsOnline(online);
      updatePendingCount();
    });

    const unsubSync = syncService.addSyncListener((synced, remaining) => {
      setPendingCount(remaining);
      if (synced > 0) {
        setSyncMessage(`Đã đồng bộ thành công ${synced} phiếu lên đám mây!`);
        setTimeout(() => setSyncMessage(null), 4000);
      }
    });

    // Check periodically
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      unsubNetwork();
      unsubSync();
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      alert('Bạn đang ngoại tuyến. Vui lòng kết nối Wi-Fi hoặc 4G để đồng bộ!');
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncService.syncOutbox();
      if (res.synced > 0) {
        setSyncMessage(`Đã đồng bộ ${res.synced} phiếu!`);
      } else if (res.remaining === 0) {
        setSyncMessage('Tất cả dữ liệu đã được đồng bộ!');
      } else {
        setSyncMessage(`Không thể kết nối máy chủ. Còn ${res.remaining} phiếu trong hàng đợi.`);
      }
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (e: any) {
      setSyncMessage('Lỗi khi đồng bộ: ' + (e?.message || 'Kiểm tra lại server'));
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsSyncing(false);
      updatePendingCount();
    }
  };

  return (
    <div className="w-full">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Chế độ ngoại tuyến (Offline) — Phiếu khảo sát sẽ được lưu an toàn trên máy</span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-700/80 px-2 py-0.5 rounded-full text-xs shrink-0 ml-2">
              Chờ gửi: {pendingCount}
            </span>
          )}
        </div>
      )}

      {/* Sync Success Notification */}
      {syncMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between transition-all duration-300">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        </div>
      )}

      {/* Online but pending items notice */}
      {isOnline && pendingCount > 0 && !syncMessage && (
        <div className="bg-blue-600 text-white px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-200" />
            <span>Có {pendingCount} phiếu khảo sát đang chờ đồng bộ lên máy chủ</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 bg-white text-blue-700 hover:bg-blue-50 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 ml-2 transition-colors disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang gửi...' : 'Đồng bộ ngay'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
