import { useState, useEffect } from 'react';
import { 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  Eye, 
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { CampusInspection } from '../types/survey';
import { db } from '../db/surveyDb';

export function CampusAnalytics() {
  const [inspections, setInspections] = useState<CampusInspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedInspection, setSelectedInspection] = useState<CampusInspection | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await db.inspections.reverse().sortBy('submittedAt');
      setInspections(all);
    } catch (err) {
      console.error('Failed to load inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = inspections.filter(item => {
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesSearch = searchTerm === '' ||
      item.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.inspectorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const totalCount = inspections.length;
  const urgentCount = inspections.filter(i => i.priority === 'urgent').length;
  const highCount = inspections.filter(i => i.priority === 'high').length;
  const goodCount = inspections.filter(i => i.priority === 'low').length;
  const syncedCount = inspections.filter(i => i.syncStatus === 'synced').length;

  // Priority Chart Data
  const priorityChartData = [
    { name: 'Khẩn cấp', count: urgentCount, color: '#ef4444' },
    { name: 'Ưu tiên cao', count: highCount, color: '#f59e0b' },
    { name: 'Trung bình', count: inspections.filter(i => i.priority === 'medium').length, color: '#3b82f6' },
    { name: 'Bình thường', count: goodCount, color: '#10b981' }
  ];

  // Export to Excel
  const handleExportExcel = () => {
    if (inspections.length === 0) {
      alert('Chưa có dữ liệu kiểm tra để xuất Excel!');
      return;
    }

    const rows = inspections.map((item, idx) => {
      // Find damaged items summary
      const damaged = item.items
        .filter(it => it.condition === 'damaged' || it.condition === 'critical')
        .map(it => `${it.name} (${it.condition === 'critical' ? 'Khẩn cấp' : 'Hư hỏng'}) - ${it.notes || ''}`)
        .join('; ');

      return {
        'STT': idx + 1,
        'Mã Phiếu': item.id,
        'Tòa Nhà': item.building,
        'Tầng': item.floor,
        'Phòng': item.room,
        'Ngày Kiểm Tra': item.inspectionDate,
        'Đánh Giá Sao': item.overallRating + ' / 5',
        'Mức Độ Ưu Tiên': item.priority.toUpperCase(),
        'Trạng Thái Đồng Bộ': item.syncStatus === 'synced' ? 'Đã lên Cloud' : 'Lưu Offline',
        'Cán Bộ Kiểm Tra': item.inspectorName,
        'Mã Cán Bộ': item.inspectorCode || '',
        'Tọa Độ GPS': item.location ? `${item.location.latitude}, ${item.location.longitude}` : 'N/A',
        'Hạng Mục Hư Hỏng': damaged || 'Tất cả bình thường',
        'Kiến Nghị / Ghi Chú': item.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KiemTraCoSoVatChat');

    const fileName = `Bao_Cao_Co_So_Vat_Chat_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Thống Kê Cơ Sở Vật Chất Khuôn Viên
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
            Báo cáo hiện trạng các phòng học, giảng đường & thiết bị trường học
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Báo Cáo Excel</span>
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-slate-500 text-xs font-semibold">Tổng số phòng đã kiểm tra</div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Đã đồng bộ: {syncedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-200 bg-red-50/30">
          <div className="text-red-600 text-xs font-semibold flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cần xử lý khẩn cấp</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">{urgentCount}</div>
          <div className="text-[11px] text-red-500 mt-1">Nguy hiểm / Hỏng nặng</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-200 bg-amber-50/30">
          <div className="text-amber-600 text-xs font-semibold">Ưu tiên cao</div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">{highCount}</div>
          <div className="text-[11px] text-amber-600 mt-1">Cần lên lịch bảo trì</div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200 bg-emerald-50/30">
          <div className="text-emerald-700 text-xs font-semibold">Đạt chuẩn bình thường</div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{goodCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1">Hoạt động tốt</div>
        </div>
      </div>

      {/* Charts Section */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority Chart */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3">
              Phân Bố Mức Độ Ưu Tiên Xử Lý
            </h3>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-2">
              {priorityChartData.map(p => (
                <div key={p.name} className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-600">{p.name}:</span>
                  <span className="font-bold text-slate-900">{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buildings Breakdown */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-3">
              Số Lượt Kiểm Tra Theo Tòa Nhà
            </h3>
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {Object.entries(
                inspections.reduce((acc, it) => {
                  acc[it.building] = (acc[it.building] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([bld, cnt]) => {
                const percent = Math.round((cnt / totalCount) * 100);
                return (
                  <div key={bld} className="text-xs">
                    <div className="flex justify-between font-bold text-slate-800 mb-1">
                      <span className="truncate">{bld}</span>
                      <span>{cnt} phòng ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter & List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tòa nhà, phòng, cán bộ..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-1.5 overflow-x-auto pb-1">
            {(['all', 'urgent', 'high', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 ${
                  filterPriority === p
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p === 'all' ? 'Tất cả' : p === 'urgent' ? 'Khẩn cấp' : p === 'high' ? 'Ưu tiên cao' : 'Bình thường'}
              </button>
            ))}
          </div>
        </div>

        {/* Inspections Cards */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
            Chưa có phiếu kiểm tra nào.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(item => {
              const damagedCount = item.items.filter(it => it.condition === 'damaged' || it.condition === 'critical').length;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedInspection(item)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-blue-400 cursor-pointer transition-all flex items-center justify-between gap-3 active:scale-[0.99]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.building} - {item.room}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                        item.priority === 'urgent' ? 'bg-red-600' : item.priority === 'high' ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}>
                        {item.priority === 'urgent' ? 'Khẩn cấp' : item.priority === 'high' ? 'Ưu tiên cao' : 'Bình thường'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span>{item.floor}</span>
                      <span>•</span>
                      <span>Ngày: {item.inspectionDate}</span>
                      <span>•</span>
                      <span>CB: {item.inspectorName}</span>
                    </div>

                    {damagedCount > 0 && (
                      <div className="text-xs text-red-600 font-semibold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Phát hiện {damagedCount} hạng mục bị hỏng</span>
                      </div>
                    )}
                  </div>

                  <Eye className="w-5 h-5 text-slate-400 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedInspection && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Chi Tiết Kiểm Tra Cơ Sở
                </h3>
                <p className="font-mono text-xs text-slate-500">{selectedInspection.id}</p>
              </div>
              <button
                onClick={() => setSelectedInspection(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 text-slate-700">
              <div><strong>Vị trí:</strong> {selectedInspection.building} - {selectedInspection.floor} - {selectedInspection.room}</div>
              <div><strong>Cán bộ kiểm tra:</strong> {selectedInspection.inspectorName} ({selectedInspection.inspectorCode})</div>
              <div><strong>Ngày kiểm tra:</strong> {selectedInspection.inspectionDate}</div>
              {selectedInspection.location && (
                <div><strong>GPS:</strong> {selectedInspection.location.latitude}, {selectedInspection.location.longitude}</div>
              )}
            </div>

            {/* Checklist details */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Kết Quả Từng Hạng Mục:
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedInspection.items.map(it => (
                  <div key={it.id} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="font-semibold text-slate-800">{it.name}</span>
                      {it.notes && <div className="text-red-500 font-medium">{it.notes}</div>}
                    </div>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      it.condition === 'critical' ? 'bg-red-100 text-red-700' : it.condition === 'damaged' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {it.condition === 'critical' ? 'Cần sửa gấp' : it.condition === 'damaged' ? 'Hư hỏng' : it.condition === 'minor_issue' ? 'Lỗi nhẹ' : 'Tốt'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photo preview if available */}
            {selectedInspection.photoDataUrl && (
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-1">Ảnh minh chứng hiện trường:</h4>
                <img
                  src={selectedInspection.photoDataUrl}
                  alt="Ảnh kiểm tra"
                  className="w-full max-h-60 object-cover rounded-2xl border border-slate-200"
                />
              </div>
            )}

            <button
              onClick={() => setSelectedInspection(null)}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
