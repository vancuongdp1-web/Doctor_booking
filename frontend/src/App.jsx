import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth, Guard } from './auth';
import { Home, Doctors, DoctorDetail } from './pages/Public';
import { Login, Register } from './pages/Auth';
import { Book, Account } from './pages/Patient';
import Dash from './pages/Dash';

function Header() {
  const { user, logout } = useAuth(), nav = useNavigate(), [open, setOpen] = useState(false), [ns, setNs] = useState([]);
  useEffect(() => { user ? api('/notifications').then(setNs).catch(() => {}) : setNs([]); }, [user, open]);
  return <header>
    <div className="w hd">
      <Link className="logo" to="/">✚ MediCare</Link>
      <nav><Link to="/">Trang chủ</Link><Link to="/doctors">Bác sĩ</Link>
        {user?.role === 'patient' && <Link to="/account">Tài khoản</Link>}
        {user && user.role !== 'patient' && <Link to="/dashboard">Quản lý</Link>}</nav>
      {user ? <><button className="lk" onClick={() => setOpen(!open)}>🔔 {ns.length}</button><span className="mt">{user.name}</span>
        <button className="btn o s" onClick={() => { logout(); nav('/'); }}>Đăng xuất</button></>
        : <><Link className="btn o s" to="/login">Đăng nhập</Link><Link className="btn s" to="/register">Đăng ký</Link></>}
    </div>
    {open && <div className="w"><div className="card">{ns.map(n => <p key={n.id}>{n.message}</p>)}{!ns.length && <p className="mt">Chưa có thông báo.</p>}</div></div>}
  </header>;
}
const Footer = () => <footer><div className="w"><b>✚ MediCare</b><p className="mt">Hotline: 1900 6789 · hotro@medicare.vn · 12 Láng Hạ, Đống Đa, Hà Nội<br />© 2026 MediCare</p></div></footer>;

export default function App() {
  return <>
    <Header />
    <Routes>
      <Route path="/" element={<Home />} /><Route path="/doctors" element={<Doctors />} /><Route path="/doctors/:id" element={<DoctorDetail />} />
      <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
      <Route path="/book/:id" element={<Guard role="patient"><Book /></Guard>} />
      <Route path="/account" element={<Guard role="patient"><Account /></Guard>} />
      <Route path="/dashboard" element={<Guard><Dash /></Guard>} />
      <Route path="*" element={<Home />} />
    </Routes>
    <Footer />
  </>;
}
