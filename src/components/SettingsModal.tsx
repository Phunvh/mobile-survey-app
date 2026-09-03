import { useState, useEffect } from 'react';
import { 
  Server, 
  Trash2, 
  Download, 
  QrCode, 
  Share2, 
  ShieldCheck,
  X
} from 'lucide-react';
import { syncService } from '../services/syncService';
import { db } from '../db/surveyDb';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset?: () => void;
}

export function SettingsModal({ isOpen, onClose, onDataReset }: SettingsModalProps) {
  const [backendUrl, setBackendUrl] = useState<string>(syncService.getBackendUrl());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [stats, setStats] = useState<{ total: number; pending: number; synced: number }>({
    total: 0,
    pending: 0,
    synced: 0
  });
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadStats();
      if (typeof window !== 'undefined') {
        setCurrentUrl(window.location.href);
      }
    }
  }, [isOpen]);

  const loadStats = async () => {
    const total = await db.inspections.count();
    const pending = await db.syncQueue.count();
    const synced = await db.inspections.where('syncStatus').equals('synced').count();
    setStats({ total, pending, synced });
  };

  if (!isOpen) return null;

  const handleSaveBackendUrl = () => {
    syncService.setBackendUrl(backendUrl);
    alert('Đã lưu cấu hình địa chỉ máy chủ API!');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setTestResult('✅ Kết nối máy chủ thành công!');
      } else {
        setTestResult(`⚠️ Máy chủ phản hồi mã ${res.status}`);
      }
    } catch (e: any) {
      setTestResult('❌ Không thể kết nối: ' + (e?.message || 'Kiểm tra lại mạng hoặc URL'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleBackupJSON = async () => {
    const all = await db.inspections.toArray();
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_campus_inspections_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLocalData = async () => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa tất cả phiếu kiểm tra cơ sở vật chất lưu trên thiết bị này. Bạn có chắc chắn không?')) {
      await db.inspections.clear();
      await db.syncQueue.clear();
      loadStats();
      if (onDataReset) onDataReset();
      alert('Đã xóa toàn bộ dữ liệu cục bộ!');
    }
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Ứng Dụng Khảo Sát Di Động Offline',
        text: 'Ứng dụng khảo sát thu thập dữ liệu chuyên nghiệp hoạt động offline-first',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép link ứng dụng vào bộ nhớ tạm!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto space-y-5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              Cài Đặt & Cấu Hình Mạng
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Chia sẻ link hoặc mở trên điện thoại */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>Mở Trên Điện Thoại Di Động</span>
            </span>
            <button
              onClick={handleShareApp}
              className="flex items-center space-x-1 text-xs font-semibold bg-white text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs"
            >
              <Share2 className="w-3 h-3" />
              <span>Chia sẻ link</span>
            </button>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Bạn có thể mở địa chỉ bên dưới trên trình duyệt điện thoại (iOS Safari hoặc Android Chrome) để sử dụng và bấm <strong>"Thêm vào Màn hình chính"</strong> để cài app.
          </p>
          <div className="bg-white p-2 rounded-xl border border-blue-200 text-xs font-mono text-slate-700 break-all select-all">
            {currentUrl}
          </div>
        </div>

        {/* 2. Cấu hình Backend Server */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            Địa chỉ Máy chủ Đồng bộ (API Cloud Server)
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="Ví dụ: /api hoặc https://my-backend.onrender.com/api"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <button
              onClick={handleSaveBackendUrl}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shrink-0"
            >
              Lưu
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
            >
              <span>{isTesting ? 'Đang kiểm tra kết nối...' : 'Kiểm tra kết nối API'}</span>
            </button>
            {testResult && (
              <span className="text-xs font-medium">{testResult}</span>
            )}
          </div>
        </div>

        {/* 3. Thống kê lưu trữ cục bộ */}
        <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
          <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Kho lưu trữ dữ liệu an toàn cục bộ (IndexedDB)</span>
          </h4>
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center">
            <div>
              <div className="text-slate-500 text-[11px]">Tổng số phiếu</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{stats.total}</div>
            </div>
            <div>
              <div className="text-emerald-700 text-[11px]">Đã đồng bộ</div>
              <div className="font-bold text-emerald-600 text-sm mt-0.5">{stats.synced}</div>
            </div>
            <div>
              <div className="text-amber-700 text-[11px]">Chờ gửi</div>
              <div className="font-bold text-amber-600 text-sm mt-0.5">{stats.pending}</div>
            </div>
          </div>
        </div>

        {/* 4. Sao lưu & Quản lý */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleBackupJSON}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Tải về file sao lưu dự phòng (JSON Backup)</span>
          </button>

          <button
            onClick={handleClearLocalData}
            className="w-full text-red-600 hover:bg-red-50 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa sạch dữ liệu khảo sát trong máy</span>
          </button>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}
