# Kiến trúc Admin SPA, đối chiếu với báo cáo đồ án

Tài liệu tham chiếu là báo cáo _Agentic AR_ (HK251), chương 3 đến 5. Phía admin là node **Admin Client** (mục 5.6.3): một SPA chạy trên trình duyệt, gọi `AgenticAR.API` (.NET) qua HTTPS (mục 5.6.7) và nhận response theo envelope chuẩn `{ success, data, message, errorCode }` (mục 5.7.2).

## 1. Ánh xạ Layered Architecture (Hình 5.1) vào client

```text
┌────────────── Presentation Layer ────────────────────────────────────────┐
│ View Module          features/*/…Page.tsx, components/ui, components/layout│
│ Presentation Logic   hooks trong features/*/api.ts, useDialogForm,         │
│                      route guards (app/guards.tsx)                         │
└───────────────────────────────┬──────────────────────────────────────────┘
┌───────────── Business rules phía client ─────────────────────────────────┐
│ Validation           features/*/schema.ts (zod)                           │
│ Auth rules           features/auth/session.ts (canAccess, hạn token)      │
│ (Nghiệp vụ chính nằm ở backend .NET; client không tự suy ra dữ liệu)       │
└───────────────────────────────┬──────────────────────────────────────────┘
┌───────────────────────── Persistence Layer ──────────────────────────────┐
│ Remote API Client    services/*.service.ts  → lib/http/api-client.ts      │
│                      (Auth/User/Building/Q&A/Chat API Manager)            │
│ Data Mapper          schema.ts: toXxxForm (DTO → form), toXxxInput        │
│ Cache Operation      TanStack Query (cache hit → trả ngay; miss → API)    │
└───────────────────────────────┬──────────────────────────────────────────┘
┌──────────────────────── Cache Storage Layer ─────────────────────────────┐
│ User cache = ['me'], ['users',…] · Building cache = ['buildings',…]       │
│ History chat cache = ['chats',…] · Session = sessionStorage (chỉ token)   │
└──────────────────────────────────────────────────────────────────────────┘
```

Luồng dữ liệu (mục 5.4.6) đi theo thứ tự sau: thao tác trên UI, rồi page handler, rồi hook `useMutation`/`useQuery`, rồi service, rồi `ApiClient`, rồi backend. Với các thao tác đọc, TanStack Query trả kết quả từ cache trước, sau đó mới gọi API khi dữ liệu cũ hoặc bị invalidate. Mỗi mutation thành công sẽ invalidate đúng query key liên quan, nên danh sách và số liệu dashboard tự cập nhật.

Mỗi lớp chỉ phụ thuộc lớp ngay dưới nó. Page không gọi `fetch`, và service không import React.

## 2. Độ phủ use case (Hình 3.5, mục 3.3.2)

| Use case trong báo cáo                                | Trạng thái | Ghi chú                                                                                                             |
| ----------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Xem danh sách tòa nhà/POI, thêm, cập nhật, xóa        | ✅         | Có thêm quản lý **tầng/phòng** và tọa độ AR cục bộ                                                                  |
| Cập nhật tọa độ GPS và mô tả                          | ✅         | Chọn trên bản đồ (ghim, khoanh vùng, tìm địa chỉ, GPS). Tọa độ AR của phòng được quy đổi ENU → Unity theo mục 2.1.4 |
| Xem danh sách người dùng, lọc theo vai trò/trạng thái | ✅         | Phân trang và lọc ở server; bộ lọc lưu trên URL                                                                     |
| Cập nhật tài khoản, khóa/mở khóa                      | ✅         | Có hộp thoại xác nhận khi đổi vai trò hoặc khóa                                                                     |
| Xem danh sách câu hỏi, trả lời câu hỏi (include)      | ✅         | Thêm, sửa, xóa câu trả lời                                                                                          |
| Quản lý danh mục câu hỏi                              | ✅         | Đếm số câu hỏi dùng danh mục trước khi xóa (Activity 4.8)                                                           |
| Xuất báo cáo (PDF/CSV)                                | ✅ CSV     | Xuất tổng quan, người dùng, tòa nhà, câu hỏi, danh mục                                                              |
| Xem thống kê điểm truy cập nhiều                      | ⚠️         | Backend chưa có endpoint; dashboard dùng 9 bộ đếm từ `/admin/dashboard/summary`                                     |
| Xem lịch sử lỗi, xem phản hồi                         | ❌         | Backend chưa có API (log lỗi/feedback)                                                                              |
| Tạo tài khoản, xóa tài khoản người dùng               | ❌         | Backend chưa có API; UI dùng “Khóa tài khoản” thay cho xóa                                                          |
| Trạng thái xử lý câu hỏi (Activity 4.7)               | ❌         | Backend không có trường status; UI không tự đặt ra                                                                  |
| Mô tả, thứ tự, trạng thái của danh mục (Activity 4.8) | ❌         | Backend chỉ có `name`                                                                                               |
| Refresh token (AuthController, mục 5.7.1)             | ❌         | Không có endpoint refresh; token hết hạn thì đăng nhập lại                                                          |

Các mục ❌ cần backend bổ sung API trước. Frontend cố ý không tạo endpoint giả.

## 3. Sequence diagram và cách hiện thực

| Sequence                             | Hiện thực                                                                                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.16 Quản lý tòa nhà/POI             | Vòng lặp “nhập đến khi hợp lệ”: zod kiểm tra ở client; nếu server trả lỗi, hộp thoại vẫn mở và hiện lỗi. Khi xóa: `useConfirmedAction` mở hộp thoại xác nhận, gọi API, hiện toast rồi làm mới danh sách |
| 4.17 Thống kê và báo cáo             | Dashboard dùng `/admin/dashboard/summary`, có nút “Xuất báo cáo” ra CSV                                                                                                                                 |
| 4.18–4.20 Câu hỏi, trả lời, danh mục | Mỗi luồng alt (thêm, sửa, xóa) dùng `FormDialog` và `useDialogForm`, hoặc `useConfirmedAction`                                                                                                          |
| 4.9 Đăng nhập                        | Đăng nhập, kiểm tra `/users/me` có quyền Admin, lưu phiên. Lỗi 401/403 ở bất kỳ request nào sẽ đăng xuất                                                                                                |

## 4. Yêu cầu phi chức năng (Bảng 5.1) phía admin

- **Security:** dùng JWT bearer, CSP, `credentials: 'omit'`, không render HTML từ API. Response cũ (của token trước đó) bị bỏ qua.
- **Performance:** mỗi trang được lazy-load thành chunk riêng, vendor được tách chunk, có cache cùng `keepPreviousData` khi phân trang. Request có timeout 20 giây và bị hủy khi rời trang.
- **Maintainability/Testability:** các lớp tách rõ ràng, có test cho API client, session, utils, i18n và luồng chính. CI chạy `npm run check`.
- **Deployability:** site tĩnh trong `dist/`, deploy bằng GitHub Pages hoặc bất kỳ static host nào.
