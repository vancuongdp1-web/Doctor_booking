import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { useFetch, SlotGrid, Table, Badge, fm, vd, dayStr, ST } from '../components';

export function Book() {
  const { id } = useParams(), [sp] = useSearchParams(), nav = useNavigate(), { user, toast } = useAuth();
  const [list] = useFetch('/doctors'), [d] = useFetch('/doctors/' + id);
  const [f, setF] = useState({ date: sp.get('date') || dayStr(1), time: sp.get('time') || '', name: user.name, phone: user.phone || '', reason: '' }), [step, setStep] = useState(1);
  const [slots, reload] = useFetch(`/doctors/${id}/slots?date=${f.date}`);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  const next = () => {
    if (step === 1 && !slots?.find(s => s.time === f.time && s.available)) return toast('Hãy chọn khung giờ còn trống');
    if (step === 2 && !(f.name.trim() && f.phone.trim() && f.reason.trim())) return toast('Nhập đủ họ tên, số điện thoại và lý do khám');
    setStep(step + 1);
  };
  const submit = async () => {
    try { await api('/appointments', { method: 'POST', body: { doctor_id: +id, appt_date: f.date, appt_time: f.time, reason: f.reason } }); setStep(4); toast('Đặt lịch thành công!'); }
    catch (e) { toast(e.message); set('time', ''); setStep(1); reload(); }
  };
  if (!d) return <div className="w sec">Đang tải...</div>;
  return <div className="w" style={{ maxWidth: 640, padding: '30px 16px' }}><h2>Đặt lịch khám</h2>
    <div className="prog">{[1, 2, 3].map(i => <i key={i} className={step >= i ? 'on' : ''} />)}</div>
    <div className="card">
      {step === 1 && <>
        <label>Bác sĩ</label><select value={id} onChange={e => nav(`/book/${e.target.value}`)}>{list?.map(x => <option key={x.id} value={x.id}>{x.name} – {x.specialty}</option>)}</select>
        <label>Ngày khám</label><input type="date" min={dayStr(0)} max={dayStr(30)} value={f.date} onChange={e => { set('date', e.target.value); set('time', ''); }} />
        <label>Khung giờ</label><SlotGrid slots={slots} value={f.time} onPick={t => set('time', t)} />
        <p className="mt">Khung giờ bị gạch là đã có người đặt hoặc bác sĩ không làm việc.</p><button className="btn" onClick={next}>Tiếp tục</button></>}
      {step === 2 && <>
        <label>Họ tên bệnh nhân</label><input value={f.name} onChange={e => set('name', e.target.value)} />
        <label>Số điện thoại</label><input value={f.phone} onChange={e => set('phone', e.target.value)} />
        <label>Lý do khám</label><textarea rows={3} value={f.reason} onChange={e => set('reason', e.target.value)} />
        <div className="row"><button className="btn o" onClick={() => setStep(1)}>Quay lại</button><button className="btn" onClick={next}>Tiếp tục</button></div></>}
      {step === 3 && <>
        <h3>Kiểm tra thông tin</h3>
        <p>Bác sĩ: <b>{d.name}</b> ({d.specialty})<br />Cơ sở: {d.clinic}<br />Thời gian: <b>{f.time}, {vd(f.date)}</b><br />Bệnh nhân: {f.name} – {f.phone}<br />Lý do: {f.reason}</p>
        <label>Thanh toán (mô phỏng)</label><select><option>Thẻ ATM nội địa</option><option>Ví MoMo</option><option>Thẻ Visa</option></select>
        <p style={{ marginTop: 10 }}>Phí khám: <b>{fm(d.fee)}</b></p>
        <div className="row"><button className="btn o" onClick={() => setStep(2)}>Quay lại</button><button className="btn gr" onClick={submit}>Xác nhận đặt lịch và thanh toán</button></div></>}
      {step === 4 && <div style={{ textAlign: 'center' }}><div className="ic">✅</div><h2>Đặt lịch thành công</h2>
        <p>Lịch khám với {d.name} lúc {f.time} ngày {vd(f.date)} đang chờ bác sĩ xác nhận.</p><button className="btn" onClick={() => nav('/account')}>Xem lịch khám của tôi</button></div>}
    </div></div>;
}

export function Account() {
  const { user, setUser, toast } = useAuth(), [list, reload] = useFetch('/appointments/mine'), [p, setP] = useState({ name: user.name, phone: user.phone || '' });
  const save = async () => { try { setUser(await api('/auth/me', { method: 'PUT', body: p })); toast('Đã cập nhật thông tin'); } catch (e) { toast(e.message); } };
  const cancel = async id => {
    if (!confirm('Bạn chắc chắn muốn hủy lịch khám này?')) return;
    try { await api(`/appointments/${id}/cancel`, { method: 'PATCH' }); toast('Đã hủy lịch khám'); reload(); } catch (e) { toast(e.message); }
  };
  const rows = l => (l || []).map(a => ({
    key: a.id, text: a.doctor + a.reason + ST[a.status], cells: [`${vd(a.appt_date)} ${a.appt_time}`, a.doctor, a.reason, <Badge s={a.status} />],
    actions: ['pending', 'confirmed'].includes(a.status) && <button className="btn r s" onClick={() => cancel(a.id)}>Hủy lịch</button>,
  }));
  const H = ['Thời gian', 'Bác sĩ', 'Lý do', 'Trạng thái'];
  return <div className="w sec"><h2>Tài khoản của tôi</h2><div className="two" style={{ gridTemplateColumns: '1fr 2fr' }}>
    <div className="card"><h3>Thông tin cá nhân</h3><label>Họ tên</label><input value={p.name} onChange={e => setP({ ...p, name: e.target.value })} />
      <label>Email</label><input value={user.email} disabled /><label>Số điện thoại</label><input value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} />
      <div className="row"><button className="btn" onClick={save}>Lưu thay đổi</button></div></div>
    <div><div className="card"><h3>Lịch khám đã đặt</h3><Table heads={H} rows={rows(list?.filter(a => a.status !== 'done'))} /></div><br />
      <div className="card"><h3>Lịch sử khám bệnh</h3><Table heads={H} rows={rows(list?.filter(a => a.status === 'done'))} /></div></div>
  </div></div>;
}
