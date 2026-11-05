# MediCare – Đặt lịch khám trực tuyến (React + Node.js + Express + MySQL)

## Chạy thử
1. Cần Node.js 18+ và MySQL 8 đang chạy.
2. Backend:
   ```
   cd backend && cp .env.example .env   # sửa DB_USER / DB_PASSWORD
   npm install && npm run seed           # tạo CSDL `medicare` + dữ liệu mẫu
   npm run dev                           # http://localhost:4000
   ```
3. Frontend (terminal khác):
   ```
   cd frontend && npm install && npm run dev   # http://localhost:5173
   ```
Tài khoản mẫu: `an@gmail.com / 123456` (bệnh nhân), `bs1@medicare.vn / 123456` (bác sĩ), `admin@medicare.vn / admin123` (quản trị).

## Cấu trúc
- `database/schema.sql`: bảng, ràng buộc. Cột `slot_key` + UNIQUE chặn trùng giờ của cùng bác sĩ ở mức CSDL.
- `backend/src`: `index.js` (API + phân quyền), `auth.js` (JWT), `db.js`, `seed.js` (dữ liệu mẫu).
- `frontend/src`: `pages/` (Public, Auth, Patient, Dash), `components.jsx`, `auth.jsx`, `api.js`.
