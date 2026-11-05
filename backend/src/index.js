import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { q } from './db.js';
import { sign, auth } from './auth.js';

const app = express();
app.use(cors(), express.json());

const wrap = f => (req, res, next) => f(req, res, next).catch(next);
const bad = (res, m, c = 400) => res.status(c).json({ message: m });
const SLOTS = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'];
const ACTIVE = "('pending','confirmed','done')";
const LABEL = { confirmed: 'Đã xác nhận', rejected: 'Bị từ chối', done: 'Đã hoàn thành', cancelled: 'Đã hủy' };
const today = () => new Date().toISOString().slice(0, 10);
const notify = (uid, m) => q('INSERT INTO notifications(user_id,message) VALUES(?,?)', [uid, m]);
const pub = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });
const worksOn = (d, date) => d.work_days.split(',').includes(String(new Date(date + 'T00:00:00').getDay()));
const one = async (sql, p) => (await q(sql, p))[0];

const DOC = `SELECT d.id,d.user_id,u.name,d.specialty_id,s.name specialty,d.clinic_id,c.name clinic,c.address clinic_address,d.degree,d.experience,d.fee,d.bio,d.work_days
 FROM doctors d JOIN users u ON u.id=d.user_id JOIN specialties s ON s.id=d.specialty_id JOIN clinics c ON c.id=d.clinic_id`;
const APPT = `SELECT a.id,a.patient_id,p.name patient,p.phone patient_phone,p.email patient_email,a.doctor_id,du.name doctor,d.user_id doctor_user_id,
 DATE_FORMAT(a.appt_date,'%Y-%m-%d') appt_date,TIME_FORMAT(a.appt_time,'%H:%i') appt_time,a.reason,a.status,a.fee
 FROM appointments a JOIN users p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id JOIN users du ON du.id=d.user_id`;

/* ---------- Xác thực ---------- */
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name?.trim() || !/\S+@\S+/.test(email || '') || (password || '').length < 6) return bad(res, 'Thông tin đăng ký không hợp lệ (mật khẩu tối thiểu 6 ký tự)');
  if (await one('SELECT id FROM users WHERE email=?', [email])) return bad(res, 'Email đã được sử dụng', 409);
  const r = await q('INSERT INTO users(name,email,password_hash,phone,role) VALUES(?,?,?,?,?)', [name.trim(), email, await bcrypt.hash(password, 10), phone || null, 'patient']);
  const u = { id: r.insertId, name: name.trim(), email, phone, role: 'patient' };
  res.status(201).json({ token: sign(u), user: pub(u) });
}));
app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await one('SELECT * FROM users WHERE email=?', [req.body.email || '']);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password_hash))) return bad(res, 'Sai email hoặc mật khẩu', 401);
  res.json({ token: sign(u), user: pub(u) });
}));
app.get('/api/auth/me', auth(), wrap(async (req, res) => res.json(pub(await one('SELECT * FROM users WHERE id=?', [req.user.id])))));
app.put('/api/auth/me', auth(), wrap(async (req, res) => {
  if (!req.body.name?.trim()) return bad(res, 'Họ tên không được để trống');
  await q('UPDATE users SET name=?,phone=? WHERE id=?', [req.body.name.trim(), req.body.phone || null, req.user.id]);
  res.json(pub(await one('SELECT * FROM users WHERE id=?', [req.user.id])));
}));
app.get('/api/notifications', auth(), wrap(async (req, res) => res.json(await q('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 20', [req.user.id]))));

/* ---------- Dữ liệu công khai ---------- */
app.get('/api/specialties', wrap(async (_, res) => res.json(await q('SELECT * FROM specialties ORDER BY id'))));
app.get('/api/clinics', wrap(async (_, res) => res.json(await q('SELECT * FROM clinics ORDER BY id'))));
app.get('/api/doctors', wrap(async (req, res) => {
  const s = +req.query.specialty || 0;
  res.json(await q(`${DOC} WHERE u.name LIKE ? AND (?=0 OR d.specialty_id=?) ORDER BY d.id`, [`%${req.query.q || ''}%`, s, s]));
}));
app.get('/api/doctors/:id', wrap(async (req, res) => {
  const d = await one(`${DOC} WHERE d.id=?`, [req.params.id]);
  d ? res.json(d) : bad(res, 'Không tìm thấy bác sĩ', 404);
}));
app.get('/api/doctors/:id/slots', wrap(async (req, res) => {
  const d = await one('SELECT work_days FROM doctors WHERE id=?', [req.params.id]);
  if (!d) return bad(res, 'Không tìm thấy bác sĩ', 404);
  const date = req.query.date || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad(res, 'Ngày không hợp lệ');
  const taken = (await q(`SELECT TIME_FORMAT(appt_time,'%H:%i') t FROM appointments WHERE doctor_id=? AND appt_date=? AND status IN ${ACTIVE}`, [req.params.id, date])).map(x => x.t);
  const open = date >= today() && worksOn(d, date);
  res.json(SLOTS.map(time => ({ time, available: open && !taken.includes(time) })));
}));

/* ---------- Bệnh nhân ---------- */
app.post('/api/appointments', auth('patient'), wrap(async (req, res) => {
  const { doctor_id, appt_date, appt_time, reason } = req.body;
  const d = await one('SELECT d.*,u.name FROM doctors d JOIN users u ON u.id=d.user_id WHERE d.id=?', [doctor_id]);
  if (!d) return bad(res, 'Không tìm thấy bác sĩ', 404);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appt_date || '') || appt_date < today()) return bad(res, 'Ngày khám không hợp lệ');
  if (!worksOn(d, appt_date) || !SLOTS.includes(appt_time)) return bad(res, 'Bác sĩ không làm việc vào thời điểm này');
  if (!reason?.trim()) return bad(res, 'Vui lòng nhập lý do khám');
  try {
    const r = await q('INSERT INTO appointments(patient_id,doctor_id,appt_date,appt_time,reason,fee) VALUES(?,?,?,?,?,?)', [req.user.id, d.id, appt_date, appt_time, reason.trim(), d.fee]);
    await notify(req.user.id, `Đặt lịch thành công với ${d.name} lúc ${appt_time} ngày ${appt_date}. Đang chờ xác nhận.`);
    await notify(d.user_id, `Có lịch khám mới lúc ${appt_time} ngày ${appt_date}.`);
    res.status(201).json({ id: r.insertId });
  } catch (e) { if (e.code === 'ER_DUP_ENTRY') return bad(res, 'Khung giờ này đã có người đặt', 409); throw e; }
}));
app.get('/api/appointments/mine', auth('patient'), wrap(async (req, res) =>
  res.json(await q(`${APPT} WHERE a.patient_id=? ORDER BY a.appt_date DESC,a.appt_time`, [req.user.id]))));
app.patch('/api/appointments/:id/cancel', auth('patient'), wrap(async (req, res) => {
  const a = await one(`${APPT} WHERE a.id=? AND a.patient_id=?`, [req.params.id, req.user.id]);
  if (!a) return bad(res, 'Không tìm thấy lịch khám', 404);
  if (!['pending', 'confirmed'].includes(a.status)) return bad(res, 'Lịch khám này không thể hủy');
  await q("UPDATE appointments SET status='cancelled' WHERE id=?", [a.id]);
  await notify(a.doctor_user_id, `${a.patient} đã hủy lịch ngày ${a.appt_date} lúc ${a.appt_time}.`);
  res.json({ ok: true });
}));

/* ---------- Bác sĩ ---------- */
const NEXT = { pending: ['confirmed', 'rejected'], confirmed: ['done'] };
app.get('/api/doctor/appointments', auth('doctor'), wrap(async (req, res) =>
  res.json(await q(`${APPT} WHERE d.user_id=? ORDER BY a.appt_date,a.appt_time`, [req.user.id]))));
app.patch('/api/doctor/appointments/:id', auth('doctor'), wrap(async (req, res) => {
  const a = await one(`${APPT} WHERE a.id=? AND d.user_id=?`, [req.params.id, req.user.id]);
  if (!a) return bad(res, 'Không tìm thấy lịch khám', 404);
  const s = req.body.status;
  if (!NEXT[a.status]?.includes(s)) return bad(res, 'Không thể chuyển sang trạng thái này');
  await q('UPDATE appointments SET status=? WHERE id=?', [s, a.id]);
  await notify(a.patient_id, `Lịch khám ngày ${a.appt_date} lúc ${a.appt_time} với ${a.doctor}: ${LABEL[s]}.`);
  res.json({ ok: true });
}));

/* ---------- Quản trị ---------- */
app.get('/api/admin/stats', auth('admin'), wrap(async (_, res) => {
  const n = async sql => (await one(sql)).n;
  const REV = "a.status IN ('confirmed','done')";
  res.json({
    patients: await n("SELECT COUNT(*) n FROM users WHERE role='patient'"), doctors: await n('SELECT COUNT(*) n FROM doctors'),
    appointments: await n('SELECT COUNT(*) n FROM appointments'),
    revenue: await n(`SELECT CAST(COALESCE(SUM(fee),0) AS UNSIGNED) n FROM appointments a WHERE ${REV}`),
    byStatus: await q('SELECT status,COUNT(*) n FROM appointments GROUP BY status'),
    bySpecialty: await q(`SELECT s.name,CAST(COALESCE(SUM(a.fee),0) AS UNSIGNED) value FROM specialties s LEFT JOIN doctors d ON d.specialty_id=s.id LEFT JOIN appointments a ON a.doctor_id=d.id AND ${REV} GROUP BY s.id,s.name`),
    byDoctor: await q(`SELECT u.name,s.name specialty,COUNT(a.id) cases,CAST(COALESCE(SUM(a.fee),0) AS UNSIGNED) revenue FROM doctors d JOIN users u ON u.id=d.user_id JOIN specialties s ON s.id=d.specialty_id LEFT JOIN appointments a ON a.doctor_id=d.id AND ${REV} GROUP BY d.id,u.name,s.name`),
  });
}));
// CRUD dùng chung: cột cho phép ghi + câu SELECT để liệt kê
const E = {
  users: { c: ['name', 'email', 'phone', 'role'], sel: 'SELECT id,name,email,phone,role FROM users ORDER BY id' },
  specialties: { c: ['name', 'icon'], sel: 'SELECT * FROM specialties ORDER BY id' },
  clinics: { c: ['name', 'address', 'phone'], sel: 'SELECT * FROM clinics ORDER BY id' },
  doctors: { c: ['user_id', 'specialty_id', 'clinic_id', 'degree', 'experience', 'fee', 'bio', 'work_days'], sel: `${DOC} ORDER BY d.id` },
  appointments: { c: ['patient_id', 'doctor_id', 'appt_date', 'appt_time', 'reason', 'status'], sel: `${APPT} ORDER BY a.appt_date DESC,a.appt_time` },
};
const pick = (c, b) => Object.fromEntries(c.filter(k => b[k] !== undefined && b[k] !== '').map(k => [k, b[k]]));
const prepare = async (e, body) => {
  const d = pick(E[e].c, body);
  if (e === 'users' && body.password) d.password_hash = await bcrypt.hash(body.password, 10);
  if (e === 'appointments' && d.doctor_id) d.fee = (await one('SELECT fee FROM doctors WHERE id=?', [d.doctor_id]))?.fee || 0;
  return d;
};
const A = [auth('admin'), (req, res, next) => E[req.params.e] ? next() : bad(res, 'Không tìm thấy', 404)];
app.get('/api/admin/:e', ...A, wrap(async (req, res) => res.json(await q(E[req.params.e].sel))));
app.post('/api/admin/:e', ...A, wrap(async (req, res) => {
  const d = await prepare(req.params.e, req.body);
  if (req.params.e === 'users') d.password_hash ??= await bcrypt.hash('123456', 10);
  res.status(201).json({ id: (await q('INSERT INTO ?? SET ?', [req.params.e, d])).insertId });
}));
app.put('/api/admin/:e/:id', ...A, wrap(async (req, res) => {
  await q('UPDATE ?? SET ? WHERE id=?', [req.params.e, await prepare(req.params.e, req.body), req.params.id]);
  res.json({ ok: true });
}));
app.delete('/api/admin/:e/:id', ...A, wrap(async (req, res) => { await q('DELETE FROM ?? WHERE id=?', [req.params.e, req.params.id]); res.json({ ok: true }); }));

app.use((e, req, res, next) => {
  console.error(e);
  const m = { ER_DUP_ENTRY: 'Dữ liệu bị trùng (email hoặc khung giờ đã được đặt)', ER_ROW_IS_REFERENCED_2: 'Không thể xóa: dữ liệu đang được sử dụng', ER_NO_REFERENCED_ROW_2: 'Dữ liệu tham chiếu không hợp lệ' }[e.code];
  res.status(m ? 409 : 500).json({ message: m || 'Lỗi máy chủ' });
});
app.listen(process.env.PORT || 4000, () => console.log('MediCare API: http://localhost:' + (process.env.PORT || 4000)));
