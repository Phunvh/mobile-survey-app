import { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Wifi, 
  WifiOff, 
  Settings,
  Database
} from 'lucide-react';
import { syncService } from '../services/syncService';
import { db } from '../db/surveyDb';

interface NavbarProps {
  onOpenSettings: () => void;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  const [isOnline, setIsOnline] = useState<boolean>(syncService.getOnlineStatus());
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const unsub = syncService.addNetworkListener((online) => {
      setIsOnline(online);
    });

    const updateCount = async () => {
      const c = await db.syncQueue.count();
      setPendingCount(c);
    };

    updateCount();
    const interval = setInterval(updateCount, 4000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Left: App Brand & Icon */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight flex items-center space-x-1.5">
              <span>Khảo Sát Di Động</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                Offline-First
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Hệ thống thu thập dữ liệu hiện trường
            </p>
          </div>
        </div>

        {/* Right: Network Status & Settings */}
        <div className="flex items-center space-x-2">
          {/* Network Indicator Pill */}
          <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {isOnline ? (
              <span className="flex items-center space-x-1">
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-[11px]">Online</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="text-[11px]">Offline</span>
              </span>
            )}
          </div>

          {/* Pending Counter Pill if > 0 */}
          {pendingCount > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <Database className="w-3 h-3 text-amber-600" />
              <span>{pendingCount}</span>
            </div>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            aria-label="Cài đặt hệ thống"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
