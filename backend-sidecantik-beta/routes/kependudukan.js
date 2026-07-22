const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');

// Role yang boleh lihat SEMUA SLS (se-desa)
const ROLE_AKSES_PENUH = ['SUPERADMIN','KEPALA DESA', 'SEKRETARIS DESA', 'AGEN STATISTIK', 'OPERATOR SID'];

// Role yang dibatasi hanya SLS di wilayah_tugas mereka
const ROLE_AKSES_WILAYAH = ['KEPALA DUSUN', 'KETUA RT'];

router.get(
  '/penduduk',
  requireRole(...ROLE_AKSES_PENUH, ...ROLE_AKSES_WILAYAH),
  async (req, res) => {
    const { search, id_sls, id_dusun, id_desa } = req.query;
    const role = req.user.role;
    const daftarSls = req.user.daftar_sls || [];

    try {
      let sql = `
        SELECT
          p.id_penduduk, p.nik, p.nama, p.tempat_lahir, p.tanggal_lahir, p.umur,
          p.jenis_kelamin, p.status_perkawinan, p.status_hubungan_keluarga,
          p.pendidikan_tertinggi, p.pekerjaan, p.agama,
          s.nama_sls, d.nama_dusun, ds.nama_desa
        FROM penduduk p
        LEFT JOIN sls s ON p.id_sls_domisili = s.id_sls
        LEFT JOIN dusun d ON s.id_dusun = d.id_dusun
        LEFT JOIN desa ds ON d.id_desa = ds.id_desa
        WHERE 1=1
      `;
      const params = [];

      // Pembatasan wilayah untuk KEPALA DUSUN / KETUA RT
      if (ROLE_AKSES_WILAYAH.includes(role)) {
        if (daftarSls.length === 0) {
          return res.json({ success: true, data: [] }); // belum ada wilayah_tugas, jangan tampilkan apapun
        }
        sql += ` AND p.id_sls_domisili IN (${daftarSls.map(() => '?').join(',')})`;
        params.push(...daftarSls);
      }

      // Filter tambahan (opsional dari frontend, tetap divalidasi di server)
      if (id_sls) {
        sql += ` AND p.id_sls_domisili = ?`;
        params.push(id_sls);
      }
      if (id_dusun) {
        sql += ` AND d.id_dusun = ?`;
        params.push(id_dusun);
      }
      if (id_desa) {
        sql += ` AND ds.id_desa = ?`;
        params.push(id_desa);
      }
      if (search) {
        sql += ` AND (p.nama LIKE ? OR p.nik LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ` ORDER BY p.nama ASC LIMIT 500`;

      const [rows] = await db.query(sql, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error("Error ambil data kependudukan:", error);
      res.status(500).json({ success: false, message: "Gagal mengambil data kependudukan." });
    }
  }
);

module.exports = router;
