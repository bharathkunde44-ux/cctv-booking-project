const jwt = require("jsonwebtoken");

function getToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

function adminAuth(req, res, next) {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "Admin JWT secret is not configured" });
  }

  const token = getToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized admin request" });
  }

  try {
    req.admin = jwt.verify(token, secret);
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired admin session" });
  }
}

module.exports = adminAuth;
