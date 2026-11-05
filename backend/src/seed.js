import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import 'dotenv/config';

const c = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true });
await c.query(fs.readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
const h = p => bcrypt.hashSync(p, 10), ins = async (sql, rows) => { for (const r of rows) await c.query(sql, r); };

await ins('INSERT INTO specialties(id,name,icon) VALUES(?,?,?)', [[1, 'Tim mạch', '❤️'], [2, 'Nhi khoa', '🧸'], [3, 'Da liễu', '🧴'], [4, 'Răng hàm mặt', '🦷'], [5, 'Thần kinh', '🧠'], [6, 'Mắt', '👁️']]);
await ins('INSERT INTO clinics(id,name,address,phone) VALUES(?,?,?,?)', [[1, 'Bệnh viện MediCare Hà Nội', '12 Láng Hạ, Đống Đa, Hà Nội', '024 3999 8888'], [2, 'Phòng khám Đa khoa Cầu Giấy', '88 Trần Thái Tông, Cầu Giấy, Hà Nội', '024 3777 6666'], [3, 'MediCare Sài Gòn', '25 Nguyễn Huệ, Quận 1, TP.HCM', '028 3555 4444']]);
const docs = [
  ['PGS.TS. Nguyễn Minh Khôi', 'Phó giáo sư, Tiến sĩ', 1, 1, 22, 400000, '1,2,3,4,5'], ['TS.BS. Trần Thu Hà', 'Tiến sĩ, Bác sĩ', 2, 2, 15, 300000, '1,3,5'],
  ['ThS.BS. Lê Quang Huy', 'Thạc sĩ, Bác sĩ', 3, 1, 9, 250000, '2,4,6'], ['BSCKII. Phạm Thị Lan', 'Bác sĩ chuyên khoa II', 4, 3, 18, 350000, '1,2,3,4,5'],
  ['TS.BS. Đặng Văn Hùng', 'Tiến sĩ, Bác sĩ', 5, 3, 20, 450000, '2,3,4,5,6'], ['ThS.BS. Vũ Ngọc Mai', 'Thạc sĩ, Bác sĩ', 6, 2, 11, 280000, '1,2,4,5']];
await ins('INSERT INTO users(id,name,email,password_hash,phone,role) VALUES(?,?,?,?,?,?)', [
  [1, 'Quản trị viên', 'admin@medicare.vn', h('admin123'), '0900000000', 'admin'],
  [2, 'Nguyễn Văn An', 'an@gmail.com', h('123456'), '0912345678', 'patient'], [3, 'Lê Thị Bình', 'binh@gmail.com', h('123456'), '0923456789', 'patient'], [4, 'Phạm Quốc Cường', 'cuong@gmail.com', h('123456'), '0934567890', 'patient'],
  ...docs.map((d, i) => [5 + i, d[0], `bs${i + 1}@medicare.vn`, h('123456'), null, 'doctor'])]);
await ins('INSERT INTO doctors(id,user_id,specialty_id,clinic_id,degree,experience,fee,bio,work_days) VALUES(?,?,?,?,?,?,?,?,?)',
  docs.map((d, i) => [i + 1, 5 + i, d[2], d[3], d[1], d[4], d[5], `Bác sĩ có ${d[4]} năm kinh nghiệm khám và điều trị, tận tâm và luôn lắng nghe bệnh nhân.`, d[6]]));
const fee = [400000, 300000, 250000, 350000, 450000, 280000];
// [bệnh nhân, bác sĩ, số ngày lệch so với hôm nay, giờ, lý do, trạng thái]
await ins('INSERT INTO appointments(patient_id,doctor_id,appt_date,appt_time,reason,status,fee) VALUES(?,?,DATE_ADD(CURDATE(),INTERVAL ? DAY),?,?,?,?)', [
  [2, 1, -20, '09:00', 'Đau tức ngực', 'done'], [2, 3, -9, '14:00', 'Nổi mẩn đỏ', 'done'], [3, 2, -14, '08:00', 'Con sốt cao', 'done'], [4, 4, -5, '10:00', 'Nhổ răng khôn', 'done'],
  [3, 1, -30, '08:00', 'Khám tổng quát', 'done'], [2, 1, 2, '10:00', 'Tái khám tim mạch', 'confirmed'], [3, 5, 3, '15:00', 'Đau đầu kéo dài', 'pending'], [4, 6, 1, '09:00', 'Mờ mắt', 'pending'],
  [2, 2, 4, '08:00', 'Khám định kỳ', 'cancelled'], [3, 3, 5, '16:00', 'Dị ứng', 'rejected'], [4, 1, 6, '14:00', 'Khám huyết áp', 'pending']]
  .map(([p, d, o, t, r, s]) => [p, d, o, t, r, s, fee[d - 1]]));
console.log('Đã tạo CSDL medicare và dữ liệu mẫu.');
await c.end();
