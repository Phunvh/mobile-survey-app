import Dexie, { type Table } from 'dexie';
import type { CampusInspection, SyncQueueItem, CampusArea } from '../types/survey';

export class CampusFacilityDatabase extends Dexie {
  inspections!: Table<CampusInspection, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  areas!: Table<CampusArea, string>;

  constructor() {
    super('CampusFacilityAuditDB');
    this.version(1).stores({
      inspections: 'id, building, floor, room, priority, syncStatus, overallRating, submittedAt',
      syncQueue: 'id, retryCount, createdAt',
      areas: 'id, name'
    });
  }
}

export const db = new CampusFacilityDatabase();

// Danh mục tòa nhà khuôn viên trường học
export const DEFAULT_CAMPUS_AREAS: CampusArea[] = [
  {
    id: 'building-a',
    name: 'Tòa Nhà A - Giảng Đường & Lớp Học',
    floors: ['Tầng 1 (Trệt)', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5'],
    sampleRooms: ['Phòng A101 (Hội trường)', 'Phòng A102', 'Phòng A201', 'Phòng A205', 'Phòng A301', 'Phòng A402', 'Phòng A501']
  },
  {
    id: 'building-b',
    name: 'Tòa Nhà B - Trung Tâm Thí Nghiệm & Thực Hành',
    floors: ['Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4'],
    sampleRooms: ['Lab Vật Lý B101', 'Lab Hóa Học B102', 'Phòng Máy Tính 1 B201', 'Phòng Máy Tính 2 B202', 'Xưởng Cơ Khí B301']
  },
  {
    id: 'library',
    name: 'Tòa Nhà Thư Viện & Trung Tâm Học Liệu',
    floors: ['Tầng 1 - Sảnh mượn trả', 'Tầng 2 - Phòng đọc mở', 'Tầng 3 - Phòng tra cứu điện tử'],
    sampleRooms: ['Sảnh mượn trả sách', 'Phòng đọc tự học số 1', 'Phòng đọc nhóm 2A', 'Phòng máy chủ thư viện']
  },
  {
    id: 'dormitory',
    name: 'Khu Ký Túc Xá Sinh Viên',
    floors: ['Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5'],
    sampleRooms: ['Phòng KTX 101', 'Phòng KTX 204', 'Phòng KTX 308', 'Khu sinh hoạt chung', 'Khu giặt sấy']
  },
  {
    id: 'sports-center',
    name: 'Khu Thể Thao & Nhà Thi Đấu Đa Năng',
    floors: ['Tầng 1 - Sân thi đấu', 'Tầng 2 - Khán đài'],
    sampleRooms: ['Sân bóng rổ trong nhà', 'Sân cầu lông 1', 'Sân bóng đá cỏ nhân tạo', 'Phòng thay đồ nam/nữ']
  },
  {
    id: 'canteen',
    name: 'Khu Căn Tin & Nhà Ăn Sinh Viên',
    floors: ['Tầng 1'],
    sampleRooms: ['Khu vực chế biến', 'Sảnh ăn chung 1', 'Sảnh ăn chung 2', 'Khu rửa dọn khay']
  }
];

// Danh sách hạng mục cơ sở vật chất chuẩn cần kiểm tra
export const DEFAULT_INSPECTION_ITEMS = [
  { id: 'cat_electric', category: 'Điện & Chiếu sáng', name: 'Đèn tuýp LED / Đèn chiếu sáng lớp học' },
  { id: 'cat_switch', category: 'Điện & Chiếu sáng', name: 'Công tắc, ổ cắm & hộp cầu dao' },
  { id: 'cat_fan', category: 'Điện & Chiếu sáng', name: 'Quạt trần / Quạt treo tường' },
  { id: 'cat_ac', category: 'Điều hòa & Thông gió', name: 'Máy điều hòa nhiệt độ (Khả năng làm mát & lưới lọc)' },
  { id: 'cat_furniture', category: 'Bàn ghế & Nội thất', name: 'Bàn ghế sinh viên (Độ chắc chắn, không gãy vỡ)' },
  { id: 'cat_podium', category: 'Bàn ghế & Nội thất', name: 'Bàn giảng viên & Bục giảng' },
  { id: 'cat_board', category: 'Thiết bị giảng dạy', name: 'Bảng từ / Bảng viết phấn & Máy chiếu / Màn chiếu' },
  { id: 'cat_doors', category: 'Cửa & Cửa sổ', name: 'Cửa ra vào chính, khóa chốt & tay nắm' },
  { id: 'cat_windows', category: 'Cửa & Cửa sổ', name: 'Cửa sổ kính & chốt an toàn chắn gió' },
  { id: 'cat_pccc', category: 'An toàn PCCC', name: 'Bình chữa cháy bột/CO2 (Kiểm tra áp suất & niêm phong)' },
  { id: 'cat_exit', category: 'An toàn PCCC', name: 'Đèn EXIT chỉ dẫn thoát hiểm & Đèn sự cố' },
  { id: 'cat_water', category: 'Cấp thoát nước & WC', name: 'Vòi nước, bồn rửa lavabo & hệ thống thoát sàn' },
  { id: 'cat_wall_floor', category: 'Hạ tầng kết cấu', name: 'Tường nứt, trần nhà dột, gạch lát sàn không vỡ' }
];

export async function initDatabase() {
  const count = await db.areas.count();
  if (count === 0) {
    await db.areas.bulkAdd(DEFAULT_CAMPUS_AREAS);
    console.log('Seeded default campus areas to IndexedDB');
  }
}
