import { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed as app)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not installed, show after 2 seconds
    if (isIosDevice && !isStandalone) {
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('PWA_IOS_DISMISSED');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowPrompt(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('PWA_IOS_DISMISSED', 'true');
    }
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-white">Cài đặt ứng dụng Khảo Sát</h4>
            <p className="text-xs text-slate-300">
              Cài vào điện thoại để mở nhanh, chạy toàn màn hình và dùng khi mất mạng.
            </p>
          </div>
        </div>
        <button 
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {deferredPrompt ? (
        <button
          onClick={handleInstallClick}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-98"
        >
          <Download className="w-4 h-4" />
          <span>Cài đặt ngay lên điện thoại</span>
        </button>
      ) : isIOS ? (
        <div className="bg-slate-800/80 rounded-xl p-3 text-xs text-slate-300 space-y-1.5 border border-slate-700">
          <p className="font-semibold text-white flex items-center space-x-1.5">
            <span>Hướng dẫn cài đặt trên iPhone / iPad:</span>
          </p>
          <div className="flex items-center space-x-2">
            <span>1. Bấm nút Chia sẻ</span>
            <Share2 className="w-4 h-4 text-blue-400 inline" />
            <span>ở thanh dưới Safari</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>2. Chọn</span>
            <PlusSquare className="w-4 h-4 text-emerald-400 inline" />
            <span className="font-medium text-white">"Thêm vào MH chính" (Add to Home Screen)</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
