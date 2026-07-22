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
    res.json({ success: true, message: "User baru berhasil disimpan!" });
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

module.exports = router;
