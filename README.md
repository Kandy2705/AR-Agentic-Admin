# AR-Agentic-Admin

Trang quản trị (Admin SPA) của hệ thống **Agentic AR**, tức node _Admin Client_ trong Deployment Diagram (Hình 5.3). Ứng dụng gọi trực tiếp backend .NET qua HTTPS và không chứa dữ liệu demo hay tài khoản mẫu.

## Công nghệ

| Hạng mục             | Công nghệ                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| UI                   | **React 19** + **TypeScript** (strict)                                                                   |
| Build / dev server   | **Vite 7** (có proxy `/__backend` khi dev)                                                               |
| Styling              | **Tailwind CSS 4** (design token khai báo trong `src/styles/index.css`)                                  |
| Routing              | **React Router 7** (hash router, lazy-load từng trang)                                                   |
| Server state / cache | **TanStack Query 5**                                                                                     |
| Form & validation    | **React Hook Form** + **Zod**                                                                            |
| Icon / font          | lucide-react, Inter (self-host)                                                                          |
| Bản đồ               | **Leaflet** + react-leaflet, nền OpenStreetMap / Esri (đường phố và vệ tinh), tìm địa chỉ bằng Nominatim |
| Test                 | **Vitest** + Testing Library (jsdom)                                                                     |
| Chất lượng code      | ESLint 9 (flat config) + Prettier (tự sắp xếp class Tailwind)                                            |

## Chạy local

Cần Node.js 22.18 trở lên.

```bash
npm ci
cp .env.example .env
npm run dev          # http://localhost:5173, gọi API thật qua proxy, không cần CORS
npm run dev:mock     # chạy offline với API giả (dữ liệu hư cấu, mật khẩu "wrong" sẽ báo lỗi)
```

File `.env` chỉ chứa **địa chỉ API công khai**:

```dotenv
ADMIN_API_BASE_URL=https://ar-agentic-bscygtc7gdf7b4ga.southeastasia-01.azurewebsites.net
```

Đăng nhập bằng một tài khoản **Admin** đang hoạt động. Sau khi đăng nhập, ứng dụng gọi `GET /api/v1/users/me`. Tài khoản Customer, Employee, tài khoản bị khóa hoặc không xác định được sẽ không vào được.

## Scripts

| Lệnh                              | Việc làm                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                     | Dev server, hot reload                                        |
| `npm run dev:mock`                | Dev server và API giả offline                                 |
| `npm run build`                   | Typecheck rồi build ra `dist/`                                |
| `npm run preview`                 | Phục vụ thư mục `dist/` tại http://localhost:4173             |
| `npm run lint` / `npm run format` | ESLint / Prettier                                             |
| `npm test`                        | Unit test và integration test (Vitest)                        |
| `npm run check`                   | Chạy toàn bộ: lint, format, typecheck, test, build (giống CI) |

## Cấu trúc thư mục

```text
src/
  app/            App, providers, router, route guards
  components/
    layout/       Sidebar, Topbar, AppLayout, navigation config
    ui/           Button, Card, Dialog, DataTable, Pagination, form fields…
    feedback/     Toast, Confirm dialog, useNotify, useConfirmedAction
  features/       Mỗi module một thư mục: Page + api.ts (hooks) + schema.ts + dialogs
    auth/  dashboard/  users/  buildings/  support/  chats/  account/
  services/       Remote API client theo module và query keys
  lib/            http/api-client.ts, utils, csv, validation, errors
  hooks/          useDialogForm, useLocalTable
  i18n/           I18nProvider, từ điển tiếng Việt (test kiểm tra không thiếu key)
  types/api.ts    DTO khớp với backend
  test/           setup và mock backend
```

Kiến trúc được đối chiếu với báo cáo trong [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Hợp đồng API và các giới hạn của backend nằm trong [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

### Thêm một màn hình mới

1. Thêm hàm gọi API vào `src/services/<module>.service.ts` và query key vào `query-keys.ts`.
2. Tạo `src/features/<module>/api.ts` chứa các hook `useQuery`/`useMutation`.
3. Tạo `schema.ts`: một zod schema, kèm hàm map từ form sang payload.
4. Tạo trang `<Name>Page.tsx` (export default), ghép từ `components/ui`.
5. Khai báo route trong `src/app/router.tsx` và menu trong `components/layout/navigation.ts`.
6. Thêm bản dịch vào `src/i18n/vi.ts`. Test sẽ báo nếu còn thiếu key.

## Bản đồ và tọa độ

- **Tòa nhà:** trong form thêm hoặc sửa tòa nhà có bản đồ để chọn vĩ độ/kinh độ. Có bốn cách: bấm hoặc kéo ghim, khoanh vùng quanh viền tòa nhà (lấy tâm của vùng), tìm địa chỉ, hoặc dùng GPS "Vị trí của tôi". Có nút nhảy nhanh tới cơ sở 1 và cơ sở 2.
- **Phòng:** chọn trên bản đồ sẽ điền **X = Đông** và **Z = Bắc** (đơn vị mét), tính từ điểm của tòa nhà. Cách quy đổi Geodetic → ECEF → ENU → Unity theo mục 2.1.3–2.1.4 của báo cáo nằm trong `src/lib/geo.ts`. **Y** là độ cao, nhập tay.
- Trang danh sách tòa nhà có chế độ **Bản đồ**. Trang chi tiết hiển thị tòa nhà và vị trí ước tính của các phòng.
- Toàn bộ tọa độ là **ước tính**, nên chỉnh lại khi khảo sát thực tế. Backend chưa có trường lưu vùng (polygon), nên chỉ lưu điểm tâm.

## Bảo mật

- Chỉ lưu access token và thời điểm hết hạn trong `sessionStorage` của tab hiện tại. Mật khẩu và refresh token không được lưu.
- Lỗi 401/403 sẽ đăng xuất ngay. Tài khoản được kiểm tra lại khi focus cửa sổ và định kỳ mỗi 60 giây.
- Bản build có CSP chặt: `script-src 'self'`; `connect-src` chỉ cho phép origin của API và Nominatim; `img-src` chỉ cho phép tile OpenStreetMap và Esri. Không dùng script bên thứ ba. ESLint cấm `dangerouslySetInnerHTML`.
- Không hiển thị chi tiết lỗi 5xx của server. File CSV xuất ra được chống formula injection.
- Các chặn ở UI (không cho tự khóa tài khoản, không cho tự đổi vai trò) **không thay thế** kiểm tra phía server.

## Deploy

`dist/` là site tĩnh. Hash routing và đường dẫn tương đối (`base: './'`) giúp site chạy được dưới sub-path của GitHub Pages mà không cần rewrite rule.

1. Vào **Settings → Pages**, chọn **GitHub Actions**.
2. Có thể đặt biến repository `ADMIN_API_BASE_URL`.
3. Thêm origin của frontend vào `Cors__AllowedOrigins__N` trên Azure. Với Pages, origin là `https://kandy2705.github.io`.
4. Chạy **Actions → Deploy Pages (manual)** trên nhánh `main`.

Mỗi lần đổi địa chỉ API phải build lại để cập nhật cả cấu hình lẫn CSP.
