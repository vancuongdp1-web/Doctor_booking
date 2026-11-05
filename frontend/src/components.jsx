import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';

export const ST = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', done: 'Đã hoàn thành', cancelled: 'Đã hủy', rejected: 'Bị từ chối' };
export const SLOTS = ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00'];
export const fm = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
export const vd = d => d?.split('-').reverse().join('/');
export const dayStr = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export const Badge = ({ s }) => <span className={'bd ' + s}>{ST[s]}</span>;
export const Avatar = ({ d }) => <div className="av" style={{ background: ['#1565c0', '#1b7a43', '#6a4fb3', '#c2602b', '#0e7c86', '#a63d6b'][d.id % 6] }}>{d.name.split(' ').pop()[0]}</div>;

export function useFetch(path) {
  const [data, setData] = useState(null), [err, setErr] = useState('');
  const load = useCallback(() => api(path).then(setData).catch(e => setErr(e.message)), [path]);
  useEffect(() => { load(); }, [load]);
  return [data, load, err];
}
export const Modal = ({ children, onClose }) => (
  <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}><div className="md">{children}</div></div>
);
export const SlotGrid = ({ slots, value, onPick }) => (
  <div className="slots">{slots?.map(s => <button key={s.time} disabled={!s.available} className={'slot' + (value === s.time ? ' on' : '')} onClick={() => onPick(s.time)}>{s.time}</button>)}</div>
);
export const DoctorCard = ({ d }) => (
  <div className="card">
    <div className="dr"><Avatar d={d} /><div><b>{d.name}</b><br /><span className="mt">{d.degree}</span></div></div>
    <span className="tag">{d.specialty}</span> <span className="mt">· {fm(d.fee)}</span>
    <div className="row"><Link className="btn o s" to={`/doctors/${d.id}`}>Xem chi tiết</Link><Link className="btn s" to={`/book/${d.id}`}>Đặt lịch</Link></div>
  </div>
);
// Bảng có tìm kiếm + phân trang. rows: [{key,text,cells,actions}]
export function Table({ heads, rows }) {
  const [q, setQ] = useState(''), [p, setP] = useState(1);
  const f = rows.filter(r => r.text.toLowerCase().includes(q.toLowerCase())), pages = Math.max(1, Math.ceil(f.length / 6)), pg = Math.min(p, pages);
  return <>
    <input placeholder="Tìm kiếm trong bảng" value={q} onChange={e => { setQ(e.target.value); setP(1); }} />
    <div className="tw"><table><thead><tr>{heads.map(h => <th key={h}>{h}</th>)}<th /></tr></thead><tbody>
      {f.slice((pg - 1) * 6, pg * 6).map(r => <tr key={r.key}>{r.cells.map((c, i) => <td key={i}>{c}</td>)}<td className="act">{r.actions}</td></tr>)}
      {!f.length && <tr><td colSpan={9} className="mt">Không có dữ liệu.</td></tr>}
    </tbody></table></div>
    <div className="pg"><button disabled={pg < 2} onClick={() => setP(pg - 1)}>‹</button>Trang {pg}/{pages}<button disabled={pg >= pages} onClick={() => setP(pg + 1)}>›</button></div>
  </>;
}
