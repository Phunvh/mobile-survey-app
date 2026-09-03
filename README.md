# 🏫 ỨNG DỤNG KIỂM TRA CƠ SỞ VẬT CHẤT KHUÔN VIÊN TRƯỜNG (CAMPUS FACILITY AUDIT)
### 🚀 Progressive Web App (Offline-First) & Native Android App (Capacitor)

---

## 📋 TỔNG QUAN ĐẶC TẢ HỆ THỐNG

Ứng dụng chuyên dụng phục vụ công tác **Kiểm tra, Đánh giá và Báo cáo hiện trạng cơ sở vật chất trong khuôn viên trường học** (giảng đường, phòng thí nghiệm, ký túc xá, nhà thi đấu, hệ thống PCCC, điện nước...).

Hệ thống được thiết kế và triển khai tuân thủ đầy đủ 100% các điều kiện tiên quyết và yêu cầu kỹ thuật:

1. **HTML5, TypeScript:** Kiến trúc mã nguồn kiểu dữ liệu chặt chẽ, tối ưu hiệu năng di động.
2. **Service Worker API (Cache-First Strategy):** Vận hành hoàn toàn ngoại tuyến, tải tức thì giao diện và logic khi mất kết nối mạng.
3. **Bộ nhớ đệm IndexedDB (Dexie.js):** Lưu trữ toàn bộ danh mục tòa nhà, phòng học, các tiêu chí đánh giá và phiếu kiểm tra an toàn tại thiết bị.
4. **Hàng đợi đồng bộ ngoại tuyến (Offline Sync Queue):** Tự động phát hiện khi kết nối lại mạng (qua `@capacitor/network` và sự kiện `online`) và tự động gửi nền toàn bộ phiếu kiểm tra lên máy chủ.
5. **Đóng gói tệp APK Android gốc qua Capacitor Bridge:**
   - Plugin **`@capacitor/camera`**: Chụp ảnh minh chứng hiện trạng cơ sở vật chất trực tiếp từ máy ảnh điện thoại.
   - Plugin **`@capacitor/geolocation`**: Tự động định vị tọa độ GPS chính xác tại vị trí kiểm tra.
   - Plugin **`@capacitor/network`**: Giám sát trạng thái kết nối mạng thời gian thực.
   - Dự án Native Android hoàn chỉnh tại thư mục `/android`.

---

## 🏛️ CẤU TRÚC HỆ THỐNG KIỂM TRA

### 1. Danh mục Tòa nhà & Khu vực trong trường
- **Tòa Nhà A:** Giảng Đường & Lớp Học (Hội trường A101, Phòng học A102-A501...)
- **Tòa Nhà B:** Trung Tâm Thí Nghiệm & Thực Hành (Lab Lý, Lab Hóa, Phòng máy tính, Xưởng cơ khí...)
- **Tòa Nhà Thư Viện:** Sảnh mượn trả, Phòng tự học, Phòng đọc nhóm...
- **Khu Ký Túc Xá:** Các phòng KTX, khu sinh hoạt chung, khu giặt sấy...
- **Khu Thể Thao:** Nhà thi đấu đa năng, sân bóng rổ, sân cầu lông...
- **Khu Căn Tin:** Nhà ăn sinh viên, khu chế biến thực phẩm...

### 2. Tiêu chuẩn đánh giá 13 hạng mục thiết bị
- **Hệ thống Điện:** Đèn chiếu sáng LED, công tắc ổ cắm, quạt trần, bảng cầu dao.
- **Hệ thống Điều hòa:** Máy lạnh, khả năng làm mát, lưới lọc bụi.
- **Bàn ghế & Nội thất:** Bàn ghế sinh viên, bục giảng, bảng từ / máy chiếu.
- **Cửa sổ & Cửa ra vào:** Khóa chốt an toàn, kính chắn gió.
- **Hệ thống PCCC:** Bình chữa cháy bột/CO2, đèn thoát hiểm EXIT, đèn sự cố.
- **Cấp thoát nước & WC:** Vòi nước, bồn rửa lavabo, thoát sàn không tắc nghẽn.
- **Kết cấu hạ tầng:** Tường nứt, thấm dột trần nhà, gạch lát sàn.

Mỗi hạng mục được phân loại 4 trạng thái: **Tốt** | **Lỗi nhẹ** | **Hư hỏng** | **Cần sửa gấp**.

---

## 📱 CÁCH KHỞI CHẠY VÀ SỬ DỤNG

### 1. Khởi chạy Web PWA trên máy tính và điện thoại
```bash
cd C:\Users\admin\.gemini\antigravity\scratch\mobile-survey-app
npm run dev
```
- Mở trên máy tính: `http://localhost:5173`
- Mở trên điện thoại (cùng mạng Wi-Fi): `http://<IP-Network>:5173`

### 2. Khởi chạy Máy chủ Đồng bộ Nền (Backend Cloud Server)
```bash
cd C:\Users\admin\.gemini\antigravity\scratch\mobile-survey-app
node server/server.js
```
Endpoint tiếp nhận: `POST /api/inspections/submit`

---

## 📦 CÁCH XUẤT TỆP APK ANDROID GỐC

Thư mục Native Android đã được cấu hình sẵn sàng tại:  
📁 `C:\Users\admin\.gemini\antigravity\scratch\mobile-survey-app\android`

### Cách 1: Tự động Build APK qua GitHub Actions (Khuyên dùng)
Tôi đã chuẩn bị sẵn file cấu hình [.github/workflows/build-apk.yml](file:///.github/workflows/build-apk.yml):
1. Đẩy mã nguồn lên tài khoản GitHub của bạn.
2. Vào mục **Actions** trên GitHub -> Bấm vào workflow **Build Android APK**.
3. Tải trực tiếp file **`app-debug.apk`** về điện thoại và bấm **Cài đặt**.

### Cách 2: Mở trong Android Studio
Nếu máy bạn có cài đặt Android Studio:
```bash
npx cap open android
```
Trong Android Studio, chọn menu **Build > Build Bundle(s) / APK(s) > Build APK(s)** để xuất file `.apk`.

---

## 📊 TÍNH NĂNG BÁO CÁO & XUẤT DỮ LIỆU EXCEL

- Bảng điều khiển phân tích trực quan: Tỷ lệ phòng đạt chuẩn vs phòng hư hỏng, phân bố mức độ ưu tiên xử lý (Khẩn cấp / Cao / Trung bình / Thấp).
- Nút **"Xuất Báo Cáo Excel"**: Tự động xuất file bảng tính `.xlsx` chi tiết từng phòng, mã cán bộ, tọa độ GPS, danh sách thiết bị hỏng và kiến nghị sửa chữa.
