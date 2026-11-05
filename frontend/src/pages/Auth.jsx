import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function AuthForm({ reg }) {
  const { login, register, toast } = useAuth(), nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    try { const u = await (reg ? register(f) : login(f)); toast(reg ? 'Đăng ký thành công' : 'Xin chào, ' + u.name); nav(u.role === 'patient' ? '/' : '/dashboard'); }
    catch (err) { toast(err.message); }
  };
  return <div className="w" style={{ maxWidth: 420, padding: '30px 16px' }}><form className="card" onSubmit={submit}>
    <h2>{reg ? 'Đăng ký tài khoản' : 'Đăng nhập'}</h2>
    {reg && <><label>Họ tên</label><input value={f.name} onChange={set('name')} /><label>Số điện thoại</label><input value={f.phone} onChange={set('phone')} /></>}
    <label>Email</label><input value={f.email} onChange={set('email')} /><label>Mật khẩu</label><input type="password" value={f.password} onChange={set('password')} />
    <div className="row"><button className="btn">{reg ? 'Tạo tài khoản' : 'Đăng nhập'}</button></div>
    <p className="mt" style={{ marginTop: 12 }}>{reg ? <>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></> : <>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></>}</p>
  </form></div>;
}
export const Login = () => <AuthForm />;
export const Register = () => <AuthForm reg />;
