import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFetch, DoctorCard, SlotGrid, Avatar, fm, dayStr } from '../components';

export function Home() {
  const nav = useNavigate(), [q, setQ] = useState('');
  const [sp] = useFetch('/specialties'), [ds] = useFetch('/doctors'), [cl] = useFetch('/clinics');
  const search = () => { const s = q && sp?.find(x => x.name.toLowerCase().includes(q.toLowerCase())); nav(s ? `/doctors?specialty=${s.id}` : `/doctors?q=${encodeURIComponent(q)}`); };
  return <>
    <section className="hero"><div className="w"><h1>Đặt lịch khám trực tuyến,<br />không cần xếp hàng chờ</h1>
      <p>Tìm bác sĩ theo chuyên khoa, chọn khung giờ còn trống và thanh toán ngay trên website.</p>
      <div className="sb"><input placeholder="Tìm bác sĩ hoặc chuyên khoa" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} /><button className="btn" onClick={search}>Tìm kiếm</button></div></div></section>
    <section className="sec"><div className="w"><h2>Chuyên khoa nổi bật</h2><div className="grid">
      {sp?.map(s => <Link key={s.id} to={`/doctors?specialty=${s.id}`} className="card c"><div className="ic">{s.icon}</div><b>{s.name}</b></Link>)}</div></div></section>
    <section className="sec alt"><div className="w"><h2>Bác sĩ nổi bật</h2><div className="grid">{ds?.slice(0, 3).map(d => <DoctorCard key={d.id} d={d} />)}</div>
      <div className="row"><Link className="btn o" to="/doctors">Xem tất cả bác sĩ</Link></div></div></section>
    <section className="sec"><div className="w"><h2>Cơ sở y tế</h2><div className="grid">{cl?.map(c => <div className="card" key={c.id}><h3>🏥 {c.name}</h3><p className="mt">{c.address}<br />☎ {c.phone}</p></div>)}</div></div></section>
    <section className="sec alt"><div className="w"><h2>Quy trình đặt lịch</h2><div className="steps">
      {['Tìm bác sĩ phù hợp', 'Chọn ngày và giờ khám', 'Nhập lý do khám, thanh toán', 'Chờ bác sĩ xác nhận'].map((t, i) => <div className="st" key={t}><b>{i + 1}</b><div>{t}</div></div>)}</div></div></section>
  </>;
}

export function Doctors() {
  const [p, setP] = useSearchParams(), q = p.get('q') || '', s = p.get('specialty') || '';
  const [sp] = useFetch('/specialties'), [ds] = useFetch(`/doctors?q=${encodeURIComponent(q)}&specialty=${s}`);
  const set = (k, v) => { const n = new URLSearchParams(p); v ? n.set(k, v) : n.delete(k); setP(n, { replace: true }); };
  return <div className="w sec"><h2>Danh sách bác sĩ</h2>
    <div className="two" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <input placeholder="Tìm bác sĩ theo tên" value={q} onChange={e => set('q', e.target.value)} />
      <select value={s} onChange={e => set('specialty', e.target.value)}><option value="">Tất cả chuyên khoa</option>{sp?.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div><br />
    <div className="grid">{ds?.map(d => <DoctorCard key={d.id} d={d} />)}</div>
    {ds && !ds.length && <p className="mt">Không tìm thấy bác sĩ phù hợp. Hãy thử từ khóa khác.</p>}</div>;
}

const DN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export function DoctorDetail() {
  const { id } = useParams(), nav = useNavigate(), [d] = useFetch('/doctors/' + id), [date, setDate] = useState(dayStr(1));
  const [slots] = useFetch(`/doctors/${id}/slots?date=${date}`);
  if (!d) return <div className="w sec">Đang tải...</div>;
  return <div className="w sec"><Link to="/doctors">‹ Danh sách bác sĩ</Link>
    <div className="two" style={{ gridTemplateColumns: '1fr 2fr', marginTop: 12 }}>
      <div className="card"><div className="dr"><Avatar d={d} /><div><h3 style={{ margin: 0 }}>{d.name}</h3><span className="mt">{d.degree}</span></div></div>
        <p><span className="tag">{d.specialty}</span></p><p>Kinh nghiệm: {d.experience} năm<br />Phí khám: <b>{fm(d.fee)}</b><br />Làm việc: {d.work_days.split(',').map(x => DN[x]).join(', ')}</p>
        <p>{d.bio}</p><p className="mt">🏥 {d.clinic}<br />{d.clinic_address}</p>
        <Link className="btn" to={`/book/${d.id}`}>Đặt lịch khám</Link></div>
      <div className="card"><h3>Lịch làm việc và khung giờ trống</h3><label>Chọn ngày</label>
        <input type="date" min={dayStr(0)} value={date} onChange={e => setDate(e.target.value)} /><br /><br />
        <SlotGrid slots={slots} onPick={t => nav(`/book/${id}?date=${date}&time=${t}`)} />
        {slots && !slots.some(s => s.available) && <p className="mt">Không còn khung giờ trống hoặc bác sĩ không làm việc ngày này.</p>}</div>
    </div></div>;
}
