const jwt = require('jsonwebtoken');

// Memverifikasi token JWT yang dikirim client di header: Authorization: Bearer <token>
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Anda belum login. Silakan login kembali.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // berisi: id_user, email, nama, role, daftar_sls
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Sesi login tidak valid atau sudah kedaluwarsa. Silakan login kembali.' });
  }
}

// Membatasi akses hanya untuk role tertentu. Contoh: requireRole('KEPALA DESA', 'SEKRETARIS DESA')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak akses untuk melakukan aksi ini.' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
