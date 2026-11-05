import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import { useAuth } from '../auth';
import { useFetch, Table, Badge, Modal, fm, vd, ST, SLOTS } from '../components';

const Shell = ({ tabs, tab, setTab, children }) => (
  <div className="w dash"><aside>{tabs.map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}</aside><main>{children}</main></div>
);
const Stats = ({ items }) => <div className="grid">{items.map(([t, v]) => <div className="card stat" key={t}><b>{v}</b>{t}</div>)}</div>;

/* ----- Bác sĩ ----- */
function DoctorDash() {
  const { toast } = useAuth(), [tab, setTab] = useState('ov'), [list, reload] = useFetch('/doctor/appointments'), [view, setView] = useState(null);
  const L = list || [], n = s => L.filter(a => a.status === s).length;
  const set = async (id, status) => { try { await api(`/doctor/appointments/${id}`, { method: 'PATCH', body: { status } }); toast('Trạng thái: ' + ST[status]); reload(); } catch (e) { toast(e.message); } };
  const rows = l => l.map(a => ({
    key: a.id, text: a.patient + a.reason + ST[a.status], cells: [`${vd(a.appt_date)} ${a.appt_time}`, a.patient, a.reason, <Badge s={a.status} />],
    actions: <>
      <button className="btn o s" onClick={() => setView(a)}>Chi tiết</button>
      {a.status === 'pending' && <><button className="btn gr s" onClick={() => set(a.id, 'confirmed')}>Xác nhận</button><button className="btn r s" onClick={() => set(a.id, 'rejected')}>Từ chối</button></>}
      {a.status === 'confirmed' && <button className="btn s" onClick={() => set(a.id, 'done')}>Hoàn thành</button>}</>,
  }));
  const H = ['Thời gian', 'Bệnh nhân', 'Lý do', 'Trạng thái'];
  return <Shell tabs={[['ov', 'Tổng quan'], ['ap', 'Danh sách lịch khám'], ['hs', 'Lịch sử khám']]} tab={tab} setTab={setTab}>
    {tab === 'ov' && <><h2>Tổng quan</h2><Stats items={[['Tổng lịch khám', L.length], ['Chờ xác nhận', n('pending')], ['Đã xác nhận', n('confirmed')], ['Đã hoàn thành', n('done')]]} /><br />
      <div className="card"><h3>Lịch cần xử lý</h3><Table heads={H} rows={rows(L.filter(a => ['pending', 'confirmed'].includes(a.status)))} /></div></>}
    {tab === 'ap' && <><h2>Lịch khám được phân công</h2><Table heads={H} rows={rows(L)} /></>}
    {tab === 'hs' && <><h2>Lịch sử khám bệnh</h2><Table heads={H} rows={rows(L.filter(a => a.status === 'done'))} /></>}
    {view && <Modal onClose={() => setView(null)}><h3>Chi tiết lịch khám</h3>
      <p>Bệnh nhân: <b>{view.patient}</b><br />Điện thoại: {view.patient_phone || '—'}<br />Email: {view.patient_email}<br />Thời gian: {vd(view.appt_date)} {view.appt_time}<br />Lý do khám: {view.reason}<br />Trạng thái: <Badge s={view.status} /></p>
      <button className="btn o" onClick={() => setView(null)}>Đóng</button></Modal>}
  </Shell>;
}

/* ----- Quản trị: cấu hình CRUD dùng chung ----- */
// field: [tên cột, nhãn, kiểu, nguồn tham chiếu, lọc theo role]
const CFG = {
  users: { t: 'người dùng', c: [['name', 'Họ tên'], ['email', 'Email'], ['phone', 'Điện thoại'], ['role', 'Vai trò']],
    f: [['name', 'Họ tên'], ['email', 'Email'], ['phone', 'Số điện thoại'], ['role', 'Vai trò', 'sel', ['patient', 'doctor', 'admin']], ['password', 'Mật khẩu (để trống = 123456)', 'password']] },
  doctors: { t: 'bác sĩ', c: [['name', 'Họ tên'], ['degree', 'Trình độ'], ['specialty', 'Chuyên khoa'], ['clinic', 'Cơ sở'], ['fee', 'Phí khám']],
    f: [['user_id', 'Tài khoản (vai trò bác sĩ)', 'ref', 'users', 'doctor'], ['specialty_id', 'Chuyên khoa', 'ref', 'specialties'], ['clinic_id', 'Cơ sở y tế', 'ref', 'clinics'], ['degree', 'Trình độ'],
      ['experience', 'Kinh nghiệm (năm)', 'number'], ['fee', 'Phí khám (đ)', 'number'], ['work_days', 'Ngày làm việc (0=CN, 1=T2... vd 1,2,3)'], ['bio', 'Giới thiệu', 'area']] },
  specialties: { t: 'chuyên khoa', c: [['name', 'Tên'], ['icon', 'Biểu tượng']], f: [['name', 'Tên chuyên khoa'], ['icon', 'Biểu tượng (emoji)']] },
  clinics: { t: 'cơ sở y tế', c: [['name', 'Tên'], ['address', 'Địa chỉ'], ['phone', 'Điện thoại']], f: [['name', 'Tên cơ sở'], ['address', 'Địa chỉ'], ['phone', 'Số điện thoại']] },
  appointments: { t: 'lịch khám', c: [['patient', 'Bệnh nhân'], ['doctor', 'Bác sĩ'], ['appt_date', 'Ngày'], ['appt_time', 'Giờ'], ['status', 'Trạng thái']],
    f: [['patient_id', 'Bệnh nhân', 'ref', 'users', 'patient'], ['doctor_id', 'Bác sĩ', 'ref', 'doctors'], ['appt_date', 'Ngày', 'date'], ['appt_time', 'Giờ', 'sel', SLOTS], ['reason', 'Lý do'], ['status', 'Trạng thái', 'sel', Object.keys(ST)]] },
};
const cell = (r, k) => k === 'status' ? <Badge s={r[k]} /> : k === 'fee' ? fm(r[k]) : k === 'appt_date' ? vd(r[k]) : r[k];

function Form({ k, row, onClose, onSaved }) {
  const C = CFG[k], { toast } = useAuth(), [v, setV] = useState(row), [opts, setOpts] = useState({});
  useEffect(() => {
    C.f.filter(f => f[2] === 'ref').forEach(f => api('/admin/' + f[3]).then(l => setOpts(o => ({ ...o, [f[0]]: f[4] ? l.filter(x => x.role === f[4]) : l }))));
  }, []);
  const save = async () => {
    try { await api(row.id ? `/admin/${k}/${row.id}` : `/admin/${k}`, { method: row.id ? 'PUT' : 'POST', body: v }); toast('Đã lưu'); onSaved(); } catch (e) { toast(e.message); }
  };
  const bind = n => ({ value: v[n] ?? '', onChange: e => setV({ ...v, [n]: e.target.value }) });
  return <Modal onClose={onClose}><h3>{row.id ? 'Sửa' : 'Thêm'} {C.t}</h3>
    {C.f.map(([n, l, t, o]) => <div key={n}><label>{l}</label>
      {t === 'sel' ? <select {...bind(n)}><option value="">--</option>{o.map(x => <option key={x} value={x}>{ST[x] || x}</option>)}</select>
        : t === 'ref' ? <select {...bind(n)}><option value="">--</option>{(opts[n] || []).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        : t === 'area' ? <textarea rows={3} {...bind(n)} /> : <input type={t || 'text'} {...bind(n)} />}</div>)}
    <div className="row"><button className="btn o" onClick={onClose}>Hủy</button><button className="btn" onClick={save}>Lưu</button></div></Modal>;
}

function Crud({ k }) {
  const C = CFG[k], { toast } = useAuth(), [rows, reload] = useFetch('/admin/' + k), [form, setForm] = useState(null);
  const del = async id => {
    if (!confirm('Xóa dữ liệu này?')) return;
    try { await api(`/admin/${k}/${id}`, { method: 'DELETE' }); toast('Đã xóa'); reload(); } catch (e) { toast(e.message); }
  };
  return <><h2>Quản lý {C.t}</h2><div className="bar"><button className="btn" onClick={() => setForm({})}>+ Thêm</button></div>
    <Table heads={C.c.map(x => x[1])} rows={(rows || []).map(r => ({
      key: r.id, text: C.c.map(x => r[x[0]]).join(' '), cells: C.c.map(x => cell(r, x[0])),
      actions: <><button className="btn o s" onClick={() => setForm(r)}>Sửa</button><button className="btn r s" onClick={() => del(r.id)}>Xóa</button></>,
    }))} />
    {form && <Form k={k} row={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}</>;
}

function Admin() {
  const [tab, setTab] = useState('ov'), [s] = useFetch('/admin/stats');
  const tabs = [['ov', 'Thống kê tổng quan'], ['users', 'Người dùng'], ['doctors', 'Bác sĩ'], ['specialties', 'Chuyên khoa'], ['clinics', 'Cơ sở y tế'], ['appointments', 'Lịch khám'], ['rev', 'Doanh thu']];
  return <Shell tabs={tabs} tab={tab} setTab={setTab}>
    {tab === 'ov' && s && <><h2>Tổng quan hệ thống</h2><Stats items={[['Bệnh nhân', s.patients], ['Bác sĩ', s.doctors], ['Lịch khám', s.appointments], ['Doanh thu', fm(s.revenue)]]} /><br />
      <div className="two"><div className="card"><h3>Lịch khám theo trạng thái</h3><ResponsiveContainer width="100%" height={220}><BarChart data={s.byStatus.map(x => ({ name: ST[x.status], n: x.n }))}><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="n" name="Số lịch" fill="#1565c0" /></BarChart></ResponsiveContainer></div>
        <div className="card"><h3>Doanh thu theo chuyên khoa</h3><ResponsiveContainer width="100%" height={220}><BarChart data={s.bySpecialty}><XAxis dataKey="name" fontSize={11} /><YAxis tickFormatter={v => v / 1000 + 'k'} /><Tooltip formatter={fm} /><Bar dataKey="value" name="Doanh thu" fill="#2e9e5b" /></BarChart></ResponsiveContainer></div></div></>}
    {tab === 'rev' && s && <><h2>Thống kê doanh thu</h2><p>Tổng doanh thu (ca đã xác nhận và hoàn thành): <b>{fm(s.revenue)}</b></p>
      <Table heads={['Bác sĩ', 'Chuyên khoa', 'Số ca', 'Doanh thu']} rows={s.byDoctor.map(d => ({ key: d.name, text: d.name + d.specialty, cells: [d.name, d.specialty, d.cases, fm(d.revenue)] }))} /></>}
    {CFG[tab] && <Crud key={tab} k={tab} />}
  </Shell>;
}

export default function Dash() {
  const { user } = useAuth();
  return user.role === 'admin' ? <Admin /> : user.role === 'doctor' ? <DoctorDash /> : <Navigate to="/" replace />;
}
