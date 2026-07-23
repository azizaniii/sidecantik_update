const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const crypto = require('crypto'); // Untuk membuat UUID char(36)
const bcrypt = require('bcrypt');
const db = require('../config/db'); // FIX: file aslinya ada di config/db.js, bukan ../db
const { requireRole } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Whitelist nama tabel untuk keamanan dari SQL Injection
const ALLOWED_TABLES = ['users', 'keluarga', 'penduduk', 'anggota_keluarga', 'desa', 'dusun', 'sls', 'wilayah_tugas'];

// Kolom primary key char(36) tiap tabel — dibutuhkan untuk auto-generate UUID saat import,
// karena kolom-kolom ini NOT NULL tanpa DEFAULT di schema (init.sql).
const PK_COLUMN = {
  users: 'id_user',
  keluarga: 'id_keluarga',
  penduduk: 'id_penduduk',
  anggota_keluarga: 'id_anggota_keluarga',
  desa: 'id_desa',
  dusun: 'id_dusun',
  sls: 'id_sls',
  wilayah_tugas: 'id_wilayah_tugas'
};

// 1. ENDPOINT: Ringkasan Jumlah Data
router.get('/summary', requireRole('SUPERADMIN', 'KEPALA DESA', 'SEKRETARIS DESA', 'OPERATOR SID'), async (req, res) => {
  try {
    const summary = {};
    for (const table of ALLOWED_TABLES) {
      const [rows] = await db.query(`SELECT COUNT(*) as count FROM ??`, [table]);
      summary[table] = rows[0].count;
    }
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error ringkasan:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data summary." });
  }
});

// 2. ENDPOINT: CRUD User (Disesuaikan dengan tabel asli: id_user & email)
router.get('/users', requireRole('SUPERADMIN', 'KEPALA DESA', 'SEKRETARIS DESA'), async (req, res) => {
  try {
    const [users] = await db.query('SELECT id_user, email, nama, role FROM users ORDER BY nama ASC');
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error ambil user:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data user." });
  }
});

router.post('/users', requireRole('SUPERADMIN', 'KEPALA DESA'), async (req, res) => {
  const { email, password, nama, role } = req.body;

  if (!email || !password || !nama) {
    return res.status(400).json({ success: false, message: "Email/username, password, dan nama wajib diisi." });
  }

  try {
    const userId = crypto.randomUUID(); // Menghasilkan string UUID valid untuk char(36)
    const hashedPassword = await bcrypt.hash(password, 10); // FIX: password sekarang di-hash sebelum disimpan

    await db.query(
      'INSERT INTO users (id_user, email, password, nama, role) VALUES (?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, nama, role || 'AGEN STATISTIK']
    );
    res.json({ success: true, message: "User baru berhasil disimpan!", id_user: userId });
  } catch (error) {
    console.error("Error simpan user:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "Email/username tersebut sudah terdaftar." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// NEW: Endpoint untuk mengubah data user (sebelumnya belum ada, tombol Edit di frontend tidak punya tujuan)
router.put('/users/:id_user', requireRole('SUPERADMIN', 'KEPALA DESA'), async (req, res) => {
  const { email, password, nama, role } = req.body;

  if (!email || !nama) {
    return res.status(400).json({ success: false, message: "Email/username dan nama wajib diisi." });
  }

  try {
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET email = ?, password = ?, nama = ?, role = ? WHERE id_user = ?',
        [email, hashedPassword, nama, role, req.params.id_user]
      );
    } else {
      // Password dikosongkan di form = tidak diubah
      await db.query(
        'UPDATE users SET email = ?, nama = ?, role = ? WHERE id_user = ?',
        [email, nama, role, req.params.id_user]
      );
    }
    res.json({ success: true, message: "Data user berhasil diperbarui!" });
  } catch (error) {
    console.error("Error update user:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: "Email/username tersebut sudah dipakai user lain." });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/users/:id_user', requireRole('SUPERADMIN', 'KEPALA DESA'), async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id_user = ?', [req.params.id_user]);
    res.json({ success: true, message: "User berhasil dihapus!" });
  } catch (error) {
    console.error("Error hapus user:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus user." });
  }
});

// 3. ENDPOINT: Import Excel / CSV
router.post('/import/:table', requireRole('SUPERADMIN', 'KEPALA DESA'), upload.single('file'), async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ success: false, message: "Tabel tidak valid." });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: "File belum dipilih." });
  }

  const connection = await db.getConnection();
  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length === 0) {
      connection.release();
      return res.status(400).json({ success: false, message: "File kosong / salah format." });
    }

    // FIX: kolom id_* adalah char(36) PRIMARY KEY tanpa DEFAULT — kalau file upload tidak
    // menyertakan kolom ini, INSERT akan gagal. Kita generate UUID otomatis untuk baris yang belum punya ID.
    const pkColumn = PK_COLUMN[table];
    for (const row of data) {
      if (pkColumn && (row[pkColumn] === undefined || String(row[pkColumn]).trim() === '')) {
        row[pkColumn] = crypto.randomUUID();
      }
      // FIX: kalau import ke tabel users menyertakan kolom password, hash dulu — jangan simpan plain text.
      if (table === 'users' && row.password) {
        row.password = await bcrypt.hash(String(row.password), 10);
      }
    }

    await connection.beginTransaction();

    const columns = Object.keys(data[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${columns.map(col => `${col}=VALUES(${col})`).join(', ')}`;

    for (const row of data) {
      const values = columns.map(col => row[col] !== undefined ? row[col] : null);
      await connection.query(sql, values);
    }

    await connection.commit();
    res.json({ success: true, message: `Berhasil mengimpor ${data.length} baris ke tabel ${table}.` });
  } catch (error) {
    await connection.rollback();
    console.error("Error import:", error);
    res.status(500).json({ success: false, message: `Gagal import: ${error.message}` });
  } finally {
    connection.release();
  }
});

// 4. ENDPOINT: Export Excel
router.get('/export/:table', requireRole('SUPERADMIN', 'KEPALA DESA', 'SEKRETARIS DESA', 'OPERATOR SID'), async (req, res) => {
  const { table } = req.params;
  if (!ALLOWED_TABLES.includes(table)) {
    return res.status(400).json({ success: false, message: "Tabel tidak valid." });
  }
  try {
    // Untuk tabel users, jangan pernah ikut mengekspor kolom password (hash) keluar sistem.
    const columns = table === 'users' ? 'id_user, email, nama, role' : '*';
    const [rows] = await db.query(`SELECT ${columns} FROM ??`, [table]);
    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, table);

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="data_${table}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error("Error export:", error);
    res.status(500).json({ success: false, message: "Gagal mengekspor data." });
  }
});

// 5. ENDPOINT: Hierarki wilayah untuk dropdown (Desa > Dusun > SLS)
router.get('/wilayah-hierarchy', requireRole('SUPERADMIN', 'KEPALA DESA', 'SEKRETARIS DESA'), async (req, res) => {
  try {
    const [desa] = await db.query('SELECT id_desa AS id, nama_desa AS nama FROM desa ORDER BY nama_desa');
    const [dusun] = await db.query('SELECT id_dusun AS id, nama_dusun AS nama, id_desa FROM dusun ORDER BY nama_dusun');
    const [sls] = await db.query('SELECT id_sls AS id, nama_sls AS nama, id_dusun FROM sls ORDER BY nama_sls');
    res.json({ success: true, data: { desa, dusun, sls } });
  } catch (error) {
    console.error("Error ambil hierarki wilayah:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil data wilayah." });
  }
});

// 6. ENDPOINT: Ambil wilayah tugas milik satu user
router.get('/users/:id_user/wilayah', requireRole('SUPERADMIN', 'KEPALA DESA', 'SEKRETARIS DESA'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT wt.id_sls, s.nama_sls, s.id_dusun, d.nama_dusun
       FROM wilayah_tugas wt
       JOIN sls s ON wt.id_sls = s.id_sls
       JOIN dusun d ON s.id_dusun = d.id_dusun
       WHERE wt.id_user = ?`,
      [req.params.id_user]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error ambil wilayah user:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil wilayah tugas user." });
  }
});

// 7. ENDPOINT: Set wilayah tugas user (hapus yang lama, ganti dengan yang baru)
// Body: { role: 'KETUA RT', id_sls: '...' } ATAU { role: 'KEPALA DUSUN', id_dusun: '...' }
router.put('/users/:id_user/wilayah', requireRole('SUPERADMIN', 'KEPALA DESA', 'SEKRETARIS DESA'), async (req, res) => {
  const { id_user } = req.params;
  const { role, id_sls, id_dusun } = req.body;

  const ROLE_BUTUH_WILAYAH = ['KEPALA DUSUN', 'KETUA RT'];
  if (!ROLE_BUTUH_WILAYAH.includes(role)) {
    return res.status(400).json({ success: false, message: "Role ini tidak memerlukan wilayah tugas." });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Hapus wilayah tugas lama user ini (ganti total, bukan tambah)
    await connection.query('DELETE FROM wilayah_tugas WHERE id_user = ?', [id_user]);

    let daftarSlsBaru = [];

    if (role === 'KETUA RT') {
      if (!id_sls) throw new Error("id_sls wajib diisi untuk role KETUA RT.");
      daftarSlsBaru = [id_sls];
    } else if (role === 'KEPALA DUSUN') {
      if (!id_dusun) throw new Error("id_dusun wajib diisi untuk role KEPALA DUSUN.");
      const [slsDalamDusun] = await connection.query('SELECT id_sls FROM sls WHERE id_dusun = ?', [id_dusun]);
      daftarSlsBaru = slsDalamDusun.map(row => row.id_sls);
      if (daftarSlsBaru.length === 0) throw new Error("Dusun ini belum punya SLS terdaftar.");
    }

    for (const idSls of daftarSlsBaru) {
      const idWilayahTugas = crypto.randomUUID();
      await connection.query(
        'INSERT INTO wilayah_tugas (id_wilayah_tugas, id_user, id_sls) VALUES (?, ?, ?)',
        [idWilayahTugas, id_user, idSls]
      );
    }

    await connection.commit();
    res.json({ success: true, message: "Wilayah tugas berhasil diperbarui." });
  } catch (error) {
    await connection.rollback();
    console.error("Error set wilayah tugas:", error);
    res.status(500).json({ success: false, message: error.message || "Gagal memperbarui wilayah tugas." });
  } finally {
    connection.release();
  }
});

// =========================================================
// FITUR SQL CONSOLE — hanya untuk role tertentu (lihat mapping)
// Ditambahkan di Langkah 5, memakai db, requireRole, crypto
// yang SUDAH di-require di bagian atas file ini.
// =========================================================

const { logSqlAudit } = require('../utils/sqlAudit');

// Mapping role -> statement SQL yang diizinkan.
// SUPERADMIN   = full access (termasuk DROP/ALTER/TRUNCATE)
// OPERATOR SID = read + write (SELECT/INSERT/UPDATE/DELETE)
// KEPALA DESA  = read-only (SELECT saja)
const SQL_ROLE_PERMISSIONS = {
  'SUPERADMIN': ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME'],
  'OPERATOR SID': ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'INSERT', 'UPDATE', 'DELETE'],
  'KEPALA DESA': ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN'],
};

// Statement yang butuh konfirmasi eksplisit dari frontend sebelum dieksekusi,
// karena sifatnya mengubah/menghapus data secara permanen.
const SQL_DESTRUCTIVE_STATEMENTS = ['UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'RENAME'];

// Ambil kata pertama dari query (setelah komentar dibuang) sebagai tipe statement.
// Contoh: "SELECT * FROM users" -> "SELECT"
function getSqlStatementType(sql) {
  const cleaned = sql
    .replace(/--.*$/gm, '')          // buang komentar single-line "-- ..."
    .replace(/\/\*[\s\S]*?\*\//g, '') // buang komentar /* ... */
    .trim();
  const match = cleaned.match(/^([a-zA-Z]+)/);
  return match ? match[1].toUpperCase() : null;
}

// Cegah user memasukkan lebih dari satu statement dipisah titik koma,
// misal: "SELECT 1; DROP TABLE users;" — ini teknik injeksi umum.
function hasMultipleSqlStatements(sql) {
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .replace(/;\s*$/, ''); // izinkan satu titik koma di akhir saja
  return cleaned.includes(';');
}

// 8. ENDPOINT: Eksekusi SQL manual (SQL Console)
router.post('/sql/execute', requireRole('SUPERADMIN', 'OPERATOR SID', 'KEPALA DESA'), async (req, res) => {
  const { query, confirm } = req.body;

  // req.user berasal dari middleware verifyToken (isi JWT hasil login)
  const role = req.user.role;
  const auditMeta = {
    idUser: req.user.id_user,
    namaUser: req.user.nama,
    role: role,
    ip: req.ip,
  };

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, message: 'Query tidak boleh kosong.' });
  }

  if (hasMultipleSqlStatements(query)) {
    return res.status(400).json({ success: false, message: 'Hanya satu statement SQL yang diizinkan per eksekusi.' });
  }

  const statementType = getSqlStatementType(query);
  const allowedStatements = SQL_ROLE_PERMISSIONS[role] || [];

  if (!statementType || !allowedStatements.includes(statementType)) {
    await logSqlAudit({
      ...auditMeta,
      statementType,
      queryText: query,
      success: false,
      errorMessage: `Role ${role} tidak diizinkan menjalankan statement ${statementType}`,
    });
    return res.status(403).json({
      success: false,
      message: `Role kamu (${role}) tidak memiliki izin menjalankan statement ${statementType || 'ini'}.`,
    });
  }

  // Statement yang sifatnya merusak/mengubah data butuh konfirmasi eksplisit
  // dari frontend (confirm: true) sebelum benar-benar dieksekusi.
  if (SQL_DESTRUCTIVE_STATEMENTS.includes(statementType) && confirm !== true) {
    return res.status(428).json({
      success: false,
      requireConfirm: true,
      statementType,
      message: `Statement ${statementType} bersifat mengubah/menghapus data. Konfirmasi diperlukan untuk melanjutkan.`,
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    const [rows, fields] = await connection.query(query);

    await logSqlAudit({ ...auditMeta, statementType, queryText: query, success: true });

    return res.json({
      success: true,
      statementType,
      result: rows,
      fields: fields ? fields.map((f) => f.name) : null,
      affectedRows: rows && rows.affectedRows !== undefined ? rows.affectedRows : undefined,
    });
  } catch (error) {
    await logSqlAudit({
      ...auditMeta,
      statementType,
      queryText: query,
      success: false,
      errorMessage: error.message,
    });
    return res.status(400).json({ success: false, message: `Query gagal dijalankan: ${error.message}` });
  } finally {
    if (connection) connection.release();
  }
});

// 9. ENDPOINT: Riwayat audit log SQL (hanya SUPERADMIN & OPERATOR SID yang boleh lihat)
router.get('/sql/history', requireRole('SUPERADMIN', 'OPERATOR SID'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, id_user, nama_user, role, statement_type, query_text, success, error_message, executed_at
       FROM sql_audit_log
       ORDER BY executed_at DESC
       LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error ambil riwayat SQL:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat query.' });
  }
});
module.exports = router;
