import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const decodeDataAndReturnUserData = async (req) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Authorization token missing or invalid");
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token,  process.env.JWT_SECRET );
      req.user = decoded;
    } catch (err) {
      throw new Error("Invalid or expired token");
    }

    const { userId } = decoded;
    const [[user]] = await pool.query(
      `SELECT id, phone, role, name, email FROM users WHERE id = ?  AND is_blocked = 0 LIMIT 1`,
      [userId]
    );
    console.log(userId);

    if (!user) {
      throw new Error("User not found");
    }
    
    req.user = user;
    return user;
  } catch (error) {
    throw error;  
  }
}

export const validateUser = async (req, res, next) => {
  try {
    req.user = await decodeDataAndReturnUserData(req);
    next();
  } catch (error) {
    console.error("Error validating token:", error);
    return res.status(401).json({ msg: error.message });
  }
};


export const validateAdmin = async (req, res, next) => {
  try {
    const user = await decodeDataAndReturnUserData(req);
    req.user = user; 

    if (user.role === "admin" || user.role === "sub-admin") {
      return next();
    }

    return res
      .status(403)
      .json({ msg: "Unauthorized access, admin privileges required" });

  } catch (error) {
    console.error("Admin auth error:", error.message);
    res.status(401).json({ msg: error.message });
  }
};


export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [[user]] = await pool.query(
      `SELECT id, phone, role, name, email
       FROM users
       WHERE id = ?  AND is_blocked = 0
       LIMIT 1`,
      [decoded.userId]
    );

    req.user = user || null;

    return next();
  } catch (error) {
    // Invalid/Expired token
    req.user = null;
    return next();
  }
};
