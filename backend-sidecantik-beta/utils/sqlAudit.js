// utils/sqlAudit.js
//
// File ini isinya SATU fungsi: mencatat setiap query SQL yang dijalankan
// lewat fitur SQL Console admin, ke tabel `sql_audit_log` yang sudah kita
// buat di Langkah 3.
//
// Fungsi ini akan dipanggil dari routes/admin.js (di Langkah 5),
// dan nilai-nilai yang dikirim ke sini berasal dari `req.user`
// (hasil bongkar JWT oleh middleware verifyToken).

const db = require('../config/db'); // pool koneksi MySQL yang sudah ada

async function logSqlAudit({ idUser, namaUser, role, statementType, queryText, success, errorMessage, ip }) {
  // idUser      -> diisi dari req.user.id_user  (field JWT)
  // namaUser    -> diisi dari req.user.nama      (field JWT)
  // role        -> diisi dari req.user.role      (field JWT)
  // statementType, queryText, success, errorMessage, ip -> ditentukan
  //   di routes/admin.js saat query dijalankan, BUKAN dari JWT.

  try {
    await db.query(
      `INSERT INTO sql_audit_log
        (id_user, nama_user, role, statement_type, query_text, success, error_message, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idUser,
        namaUser,
        role,
        statementType || 'UNKNOWN',
        queryText,
        success ? 1 : 0,
        errorMessage || null,
        ip || null,
      ]
    );
  } catch (err) {
    // Sengaja tidak "throw" ulang error di sini.
    // Kalau pencatatan audit log gagal, jangan sampai bikin
    // request utama (eksekusi query admin) ikut gagal/crash.
    // Cukup dicatat ke console log server untuk keperluan debug.
    console.error('Gagal mencatat audit log SQL:', err.message);
  }
}

module.exports = { logSqlAudit };
