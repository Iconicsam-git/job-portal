import jwt from 'jsonwebtoken';

export const protectAdmin = async (req, res, next) => {
    let token = req.headers.admintoken;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.json({ success: false, message: 'Not authorized as Admin. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'admin' && !decoded.isAdmin) {
            return res.json({ success: false, message: 'Access denied: Admin privileges required.' });
        }

        req.admin = decoded;
        next();
    } catch (error) {
        res.json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
    }
};
