import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, token missing' });
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'fallback_secret_key';
    const decoded = jwt.verify(token, secret);
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    next();
  } catch (error) {
    console.error('Auth middleware verification error:', error.message);
    return res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

export const requireEmailVerified = (req, res, next) => {
  next();
};
export default protect;
