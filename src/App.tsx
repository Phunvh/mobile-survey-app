import { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  BarChart3, 
  Building 
} from 'lucide-react';
import type { CampusArea } from './types/survey';
import { db, initDatabase, DEFAULT_CAMPUS_AREAS } from './db/surveyDb';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InspectionForm } from './components/InspectionForm';
import { CampusAnalytics } from './components/CampusAnalytics';
import { SettingsModal } from './components/SettingsModal';
import { InstallPrompt } from './components/InstallPrompt';

type TabType = 'inspect' | 'analytics' | 'areas';

export function App() {
  const [areas, setAreas] = useState<CampusArea[]>(DEFAULT_CAMPUS_AREAS);
  const [activeTab, setActiveTab] = useState<TabType>('inspect');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const loadAreas = async () => {
    try {
      await initDatabase();
      const all = await db.areas.toArray();
      if (all.length > 0) {
        setAreas(all);
      }
    } catch (err) {
      console.error('Failed to load campus areas from IndexedDB:', err);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-500 selection:text-white pb-6">
      {/* Top Navbar with Online/Offline and Sync status */}
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Offline Alert Banner */}
      <OfflineIndicator />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {activeTab === 'inspect' && (
          <InspectionForm
            areas={areas}
            onSubmitted={() => {
              // Auto notify or switch tab if needed
            }}
          />
        )}

        {activeTab === 'analytics' && (
          <CampusAnalytics />
        )}

        {activeTab === 'areas' && (
          <div className="max-w-3xl mx-auto px-4 py-4 pb-28 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Khu Vực & Tòa Nhà Trong Trường
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                  Danh mục các cơ sở hạ tầng được phân loại để kiểm tra
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {areas.map(a => (
                <div key={a.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full">
                      {a.floors.length} tầng
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{a.name}</h3>
                    <div className="text-xs text-slate-500 mt-1">
                      Các tầng: {a.floors.join(', ')}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setActiveTab('inspect')}
                      className="w-full text-center text-xs font-bold text-blue-600 hover:bg-blue-50 py-2 rounded-xl border border-blue-100 transition-colors"
                    >
                      Bắt đầu kiểm tra tòa này →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* PWA Mobile Install Banner */}
      <InstallPrompt />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataReset={loadAreas}
      />

      {/* Mobile Ergonomic Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 py-2 px-6 safe-area-bottom shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* Tab 1: Inspect */}
          <button
            onClick={() => setActiveTab('inspect')}
            className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${
              activeTab === 'inspect'
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'inspect' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <span className="text-[11px]">Kiểm Tra</span>
          </button>

          {/* Tab 2: Analytics */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${
              activeTab === 'analytics'
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'analytics' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[11px]">Thống Kê</span>
          </button>

          {/* Tab 3: Campus Areas */}
          <button
            onClick={() => setActiveTab('areas')}
            className={`flex flex-col items-center space-y-1 transition-all active:scale-95 ${
              activeTab === 'areas'
                ? 'text-blue-600 font-bold'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition-colors ${activeTab === 'areas' ? 'bg-blue-50 text-blue-600' : ''}`}>
              <Building className="w-5 h-5" />
            </div>
            <span className="text-[11px]">Khu Vực</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
