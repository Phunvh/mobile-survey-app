export type FacilityCondition = 'good' | 'minor_issue' | 'damaged' | 'critical';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface InspectionItem {
  id: string;
  category: string; // Điện chiếu sáng, Bàn ghế, Điều hòa, PCCC, Cửa sổ, Vệ sinh...
  name: string;
  condition: FacilityCondition;
  notes?: string;
}

export interface CampusInspection {
  id: string; // inspect_123...
  building: string; // Tòa A, Tòa B, Tòa C, Thư viện, KTX...
  floor: string; // Tầng 1, Tầng 2, Tầng 3...
  room: string; // Phòng A101, Phòng máy tính, WC...
  inspectorName: string; // Cán bộ kiểm tra
  inspectorCode?: string; // Mã cán bộ/sinh viên
  inspectionDate: string; // YYYY-MM-DD
  overallRating: number; // 1 to 5 stars
  priority: PriorityLevel; // Mức độ ưu tiên sửa chữa
  items: InspectionItem[];
  photoDataUrl?: string; // Chụp ảnh từ camera native
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
  };
  notes?: string;
  submittedAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncedAt?: string;
  deviceInfo?: string;
}

export interface SyncQueueItem {
  id: string;
  inspection: CampusInspection;
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

export interface CampusArea {
  id: string;
  name: string;
  floors: string[];
  sampleRooms: string[];
}
