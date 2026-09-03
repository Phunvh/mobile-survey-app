import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  RotateCcw, 
  Send, 
  Clock, 
  Star, 
  Sparkles, 
  ShieldAlert,
  Layers,
  DoorOpen
} from 'lucide-react';
import type { CampusInspection, CampusArea, InspectionItem, FacilityCondition, PriorityLevel } from '../types/survey';
import { DEFAULT_INSPECTION_ITEMS } from '../db/surveyDb';
import { syncService } from '../services/syncService';
import { NativeService } from '../services/nativeService';

interface InspectionFormProps {
  areas: CampusArea[];
  onSubmitted?: () => void;
}

export function InspectionForm({ areas, onSubmitted }: InspectionFormProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas[0]?.id || 'building-a');
  const selectedArea = areas.find(a => a.id === selectedAreaId) || areas[0];

  const [selectedFloor, setSelectedFloor] = useState<string>(selectedArea?.floors[0] || 'Tầng 1');
  const [room, setRoom] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('Nguyễn Văn An');
  const [inspectorCode, setInspectorCode] = useState<string>('CB-2025');
  const [inspectionDate, setInspectionDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [overallRating, setOverallRating] = useState<number>(5);
  const [priority, setPriority] = useState<PriorityLevel>('low');
  const [notes, setNotes] = useState<string>('');

  // Checklist items
  const [items, setItems] = useState<InspectionItem[]>(
    DEFAULT_INSPECTION_ITEMS.map(item => ({
      id: item.id,
      category: item.category,
      name: item.name,
      condition: 'good',
      notes: ''
    }))
  );

  // Native Photo & GPS
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedResult, setSubmittedResult] = useState<{
    id: string;
    synced: boolean;
  } | null>(null);

  // Update floor when area changes
  useEffect(() => {
    if (selectedArea) {
      setSelectedFloor(selectedArea.floors[0]);
    }
  }, [selectedAreaId]);

  const handleConditionChange = (itemId: string, condition: FacilityCondition) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, condition } : it));
    
    // Auto suggest priority if any item is damaged or critical
    if (condition === 'critical') {
      setPriority('urgent');
    } else if (condition === 'damaged' && priority === 'low') {
      setPriority('high');
    }
  };

  const handleItemNoteChange = (itemId: string, noteText: string) => {
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, notes: noteText } : it));
  };

  // Capacitor Native Camera Capture
  const handleCapturePhoto = async () => {
    setCameraLoading(true);
    try {
      const dataUrl = await NativeService.capturePhoto();
      if (dataUrl) {
        setPhotoDataUrl(dataUrl);
      }
    } catch (err: any) {
      alert('Lỗi camera: ' + (err?.message || 'Không thể mở máy ảnh'));
    } finally {
      setCameraLoading(false);
    }
  };

  // Capacitor Native GPS Capture
  const handleGetLocation = async () => {
    setGpsLoading(true);
    try {
      const loc = await NativeService.getCurrentLocation();
      if (loc) {
        setLocation(loc);
      } else {
        alert('Không thể lấy tọa độ GPS. Hãy kiểm tra quyền truy cập vị trí trên điện thoại.');
      }
    } catch (err: any) {
      alert('Lỗi GPS: ' + (err?.message || 'Thử lại'));
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room.trim()) {
      alert('Vui lòng nhập tên phòng hoặc vị trí kiểm tra cụ thể (Ví dụ: Phòng A201, WC tầng 2...)');
      const el = document.getElementById('room_input');
      el?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const inspectionId = 'insp_' + Date.now();
      const payload: CampusInspection = {
        id: inspectionId,
        building: selectedArea.name,
        floor: selectedFloor,
        room: room.trim(),
        inspectorName: inspectorName.trim(),
        inspectorCode: inspectorCode.trim() || undefined,
        inspectionDate,
        overallRating,
        priority,
        items,
        photoDataUrl: photoDataUrl || undefined,
        location: location || undefined,
        notes: notes.trim() || undefined,
        submittedAt: new Date().toISOString(),
        syncStatus: 'pending',
        deviceInfo: NativeService.isNative() ? 'Capacitor Android Native App' : 'PWA Standalone'
      };

      const res = await syncService.submitInspection(payload);
      setSubmittedResult({
        id: inspectionId,
        synced: res.synced
      });

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err: any) {
      alert('Lỗi khi lưu phiếu kiểm tra: ' + (err?.message || 'Thử lại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNew = () => {
    setRoom('');
    setNotes('');
    setPhotoDataUrl(null);
    setLocation(null);
    setOverallRating(5);
    setPriority('low');
    setItems(DEFAULT_INSPECTION_ITEMS.map(item => ({
      id: item.id,
      category: item.category,
      name: item.name,
      condition: 'good',
      notes: ''
    })));
    setSubmittedResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // SUCCESS CONFIRMATION SCREEN
  if (submittedResult) {
    return (
      <div className="max-w-xl mx-auto p-4 sm:p-6 my-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-800">Đã Lưu Phiếu Kiểm Tra!</h2>
            <p className="text-slate-600 text-sm">
              Thông tin kiểm tra cơ sở vật chất khuôn viên trường đã được ghi nhận vào IndexedDB an toàn.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã phiếu:</span>
              <span className="font-mono font-bold text-slate-800">{submittedResult.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vị trí:</span>
              <span className="font-semibold text-slate-800">{selectedArea.name} - {room}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Người kiểm tra:</span>
              <span className="font-medium text-slate-700">{inspectorName} ({inspectorCode})</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-500">Đồng bộ đám mây:</span>
              {submittedResult.synced ? (
                <span className="font-bold text-emerald-600">✅ Đã gửi máy chủ thành công</span>
              ) : (
                <span className="font-bold text-amber-600">⚡ Đã lưu offline (Tự động gửi khi có mạng)</span>
              )}
            </div>
          </div>

          <button
            onClick={handleStartNew}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Tiến hành kiểm tra phòng tiếp theo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-28">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-blue-900 to-indigo-800 rounded-3xl p-5 sm:p-6 text-white shadow-lg mb-5 relative overflow-hidden">
        <div className="flex items-center space-x-2 text-xs font-semibold text-blue-200 uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Biểu Mẫu Kiểm Tra Thực Địa</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black leading-tight">
          Kiểm Tra Cơ Sở Vật Chất Khuôn Viên Trường
        </h1>
        <p className="text-blue-200 text-xs sm:text-sm mt-1.5 leading-relaxed">
          Hoạt động độc lập ngoại tuyến. Dữ liệu và hình ảnh được lưu trữ an toàn trên thiết bị và tự động đồng bộ khi kết nối mạng.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. KHU VỰC VÀ VỊ TRÍ CƠ SỞ VẬT CHẤT */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>1. Thông Tin Địa Điểm Kiểm Tra</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tòa nhà */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tòa nhà / Khu vực trường *
              </label>
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Tầng */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Tầng / Khu vực *</span>
              </label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {selectedArea.floors.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phòng / Vị trí cụ thể */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center space-x-1">
              <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Phòng / Khu vực cụ thể *</span>
            </label>
            <input
              id="room_input"
              type="text"
              required
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Ví dụ: Phòng A204, WC Nam tầng 2, Giảng đường A101..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {selectedArea.sampleRooms && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-slate-600 font-medium py-0.5">Gợi ý nhanh:</span>
                {selectedArea.sampleRooms.map(sr => (
                  <button
                    key={sr}
                    type="button"
                    onClick={() => setRoom(sr)}
                    className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors"
                  >
                    {sr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Người kiểm tra & Ngày */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cán bộ kiểm tra</label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mã cán bộ</label>
              <input
                type="text"
                value={inspectorCode}
                onChange={(e) => setInspectorCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày kiểm tra</label>
              <input
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* 2. CHECKLIST KIỂM TRA TỪNG HẠNG MỤC CƠ SỞ VẬT CHẤT */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              <span>2. Đánh Giá Hiện Trạng Thiết Bị & Cơ Sở</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {items.length} hạng mục
            </span>
          </div>

          <div className="space-y-3">
            {items.map((it, idx) => {
              const isBad = it.condition === 'damaged' || it.condition === 'critical';
              return (
                <div 
                  key={it.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    it.condition === 'critical'
                      ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200'
                      : it.condition === 'damaged'
                        ? 'bg-amber-50/60 border-amber-300'
                        : it.condition === 'minor_issue'
                          ? 'bg-yellow-50/50 border-yellow-200'
                          : 'bg-slate-50/70 border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-start space-x-2">
                      <span className="text-xs font-bold text-slate-400 mt-0.5">{idx + 1}.</span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-white px-2 py-0.5 rounded text-blue-700 border border-slate-200 inline-block mb-1">
                          {it.category}
                        </span>
                        <div className="font-bold text-slate-900 text-sm">
                          {it.name}
                        </div>
                      </div>
                    </div>

                    {/* Condition Selector Pills */}
                    <div className="grid grid-cols-4 gap-1 sm:w-auto">
                      {(
                        [
                          { key: 'good', label: 'Tốt', color: 'peer-checked:bg-emerald-600 peer-checked:text-white' },
                          { key: 'minor_issue', label: 'Lỗi nhẹ', color: 'peer-checked:bg-yellow-500 peer-checked:text-white' },
                          { key: 'damaged', label: 'Hư hỏng', color: 'peer-checked:bg-amber-600 peer-checked:text-white' },
                          { key: 'critical', label: 'Cần sửa gấp', color: 'peer-checked:bg-red-600 peer-checked:text-white' }
                        ] as const
                      ).map(cond => (
                        <label
                          key={cond.key}
                          className="cursor-pointer text-center"
                        >
                          <input
                            type="radio"
                            name={`cond_${it.id}`}
                            checked={it.condition === cond.key}
                            onChange={() => handleConditionChange(it.id, cond.key)}
                            className="hidden peer"
                          />
                          <div className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all border-slate-200 bg-white text-slate-600 ${cond.color} shadow-xs`}>
                            {cond.label}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Notes input if issue exists */}
                  {isBad && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-200">
                      <input
                        type="text"
                        value={it.notes || ''}
                        onChange={(e) => handleItemNoteChange(it.id, e.target.value)}
                        placeholder="Mô tả cụ thể hư hỏng (ví dụ: Cháy 2 bóng đèn, vỡ 1 kính cửa sổ...)"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. ĐÁNH GIÁ TỔNG THỂ & MỨC ĐỘ ƯU TIÊN SỬA CHỮA */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-4">
          <h3 className="font-bold text-slate-900 text-base">
            3. Đánh Giá Tổng Thể & Mức Độ Ưu Tiên Xử Lý
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Star rating */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Đánh giá chất lượng phòng (1 - 5 sao)
              </label>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setOverallRating(s)}
                    className="p-1 focus:outline-none active:scale-125 transition-transform"
                  >
                    <Star className={`w-8 h-8 ${s <= overallRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 fill-slate-100'}`} />
                  </button>
                ))}
              </div>
              <div className="text-xs font-bold text-slate-600 mt-1">
                {overallRating === 5 ? 'Tuyệt vời / Đạt chuẩn hoàn hảo' : overallRating >= 4 ? 'Khá tốt' : overallRating >= 3 ? 'Trung bình' : 'Xuống cấp / Cần bảo trì'}
              </div>
            </div>

            {/* Priority */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Mức độ ưu tiên sửa chữa
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'low', label: 'Bình thường (Low)', bg: 'peer-checked:bg-emerald-600' },
                    { key: 'medium', label: 'Trung bình (Med)', bg: 'peer-checked:bg-blue-600' },
                    { key: 'high', label: 'Ưu tiên cao (High)', bg: 'peer-checked:bg-amber-600' },
                    { key: 'urgent', label: 'Khẩn cấp (Urgent)', bg: 'peer-checked:bg-red-600' }
                  ] as const
                ).map(p => (
                  <label key={p.key} className="cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === p.key}
                      onChange={() => setPriority(p.key)}
                      className="hidden peer"
                    />
                    <div className={`p-2 rounded-xl text-center text-xs font-bold border border-slate-200 bg-white text-slate-700 ${p.bg} peer-checked:text-white transition-all`}>
                      {p.label}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Ghi chú chung */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú / Kiến nghị của cán bộ kiểm tra
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập thêm đề xuất vật tư cần thay mới, thời gian cần khắc phục xong..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 4. CHỤP ẢNH HIỆN TRƯỜNG & TỌA ĐỘ GPS (CAPACITOR PLUGINS) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/90 space-y-3">
          <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span>4. Minh Chứng Hiện Trường (Native Camera & GPS)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Capacitor Camera Capture Button */}
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={cameraLoading}
              className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                photoDataUrl 
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' 
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div className="text-xs flex-1">
                <div className="font-bold">
                  {photoDataUrl ? 'Đã chụp ảnh hiện trường' : 'Chụp ảnh bằng Camera'}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {cameraLoading ? 'Đang kích hoạt Camera...' : photoDataUrl ? 'Bấm để chụp lại' : 'Plugin @capacitor/camera'}
                </div>
              </div>
            </button>

            {/* Capacitor GPS Capture Button */}
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsLoading}
              className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition-all ${
                location 
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' 
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-xs flex-1">
                <div className="font-bold">
                  {location ? 'Đã ghi nhận GPS khuôn viên' : 'Lấy tọa độ GPS'}
                </div>
                <div className="text-slate-500 mt-0.5 truncate">
                  {gpsLoading ? 'Đang lấy vị trí...' : location ? `${location.latitude}, ${location.longitude}` : 'Plugin @capacitor/geolocation'}
                </div>
              </div>
            </button>
          </div>

          {/* Photo Preview */}
          {photoDataUrl && (
            <div className="relative inline-block mt-2">
              <img
                src={photoDataUrl}
                alt="Ảnh cơ sở vật chất"
                className="w-32 h-32 object-cover rounded-2xl border border-slate-300 shadow-md"
              />
              <button
                type="button"
                onClick={() => setPhotoDataUrl(null)}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 text-base transition-all"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                <span>Đang ghi vào IndexedDB...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Hoàn Tất & Lưu Phiếu Kiểm Tra</span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-slate-600 font-semibold mt-2">
            ⚡ Hệ thống ưu tiên ngoại tuyến: Phiếu được lưu vào IndexedDB ngay lập tức và tự động gửi lên máy chủ nền khi có kết nối Internet.
          </p>
        </div>
      </form>
    </div>
  );
}
