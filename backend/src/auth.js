import jwt from 'jsonwebtoken';
import 'dotenv/config';
const secret = () => process.env.JWT_SECRET || 'dev-secret';
export const sign = u => jwt.sign({ id: u.id, role: u.role }, secret(), { expiresIn: '7d' });
// auth() chỉ yêu cầu đăng nhập; auth('admin','doctor') yêu cầu đúng vai trò
export const auth = (...roles) => (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), secret()); }
  catch { return res.status(401).json({ message: 'Vui lòng đăng nhập' }); }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
  next();
};
