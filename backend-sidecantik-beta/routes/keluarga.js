const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

// Endpoint: Mendapatkan daftar keluarga berdasarkan ID SLS
// GET /api/keluarga/sls/:id_sls
router.get('/sls/:id_sls', async (req, res) => {
  const { id_sls } = req.params;

  try {
    const query = `
      SELECT 
        k.id_keluarga, 
        k.id_sls_administrasi,
        k.no_kk, 
        k.status_keberadaan,
        k.alamat,
        k.kesesuaian_domisili,
        k.no_hp,
        kk.nama AS nama_kepala_keluarga,
        k.status,
        k.catatan_reject,
        k.catatan,
        k.latitude,
        k.longitude,
        s.nama_sls AS nama_sls,
        d.nama_dusun AS nama_dusun,
        ds.nama_desa AS nama_desa,
        COUNT(a.id_anggota_keluarga) AS jumlah_anggota
      FROM keluarga k

      JOIN anggota_keluarga kk 
          ON k.id_keluarga = kk.id_keluarga 
          AND kk.status_hubungan_keluarga = 'KEPALA KELUARGA'

      LEFT JOIN anggota_keluarga a 
          ON k.id_keluarga = a.id_keluarga

      JOIN sls s ON k.id_sls_administrasi = s.id_sls
      JOIN dusun d ON s.id_dusun = d.id_dusun
      JOIN desa ds ON d.id_desa = ds.id_desa

      WHERE k.id_sls_administrasi = ?

      GROUP BY 
          k.id_keluarga, 
          k.no_kk, 
          kk.nama,
          s.nama_sls,
          d.nama_dusun,
          ds.nama_desa;
    `;

    const [rows] = await db.query(query, [id_sls]);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

// Endpoint untuk keperluan Sync 
router.post('/sync', async (req, res) => {
  const dataKeluarga = req.body;

  // Cek jika array kosong
  if (!dataKeluarga || dataKeluarga.length === 0) {
    return res.status(400).json({ message: "Tidak ada data keluarga untuk disinkronisasi." });
  }

  try {
    // 1. Mapping data dari JSON Frontend menjadi Array of Arrays untuk MySQL
    // Pastikan urutannya SAMA PERSIS dengan urutan kolom di query INSERT di bawah.
    // Gunakan '|| null' untuk mengubah string kosong ('') dari React menjadi NULL di MySQL.
    const values = dataKeluarga.map(k => [
      k.id_keluarga,
      k.no_kk || k.nomor_kk || null,
      k.id_sls_administrasi || null,
      k.status_keberadaan || null,
      k.alamat || null,
      k.kesesuaian_domisili || null,
      k.latitude || null,
      k.longitude || null,
      k.no_hp || null,
      k.catatan || null,
      k.catatan_reject || null,
      k.status || null,
      k.last_modified_at || null,
      k.last_modified_by || null
    ]);

    // 2. Query UPSERT (Insert on Duplicate Key Update)
    const query = `
      INSERT INTO keluarga (
        id_keluarga, no_kk, id_sls_administrasi, status_keberadaan,
        alamat, kesesuaian_domisili, latitude, longitude, no_hp,
        catatan, catatan_reject, status, last_modified_at, last_modified_by
      ) VALUES ?
      ON DUPLICATE KEY UPDATE 
        no_kk = VALUES(no_kk),
        id_sls_administrasi = VALUES(id_sls_administrasi),
        status_keberadaan = VALUES(status_keberadaan),
        alamat = VALUES(alamat),
        kesesuaian_domisili = VALUES(kesesuaian_domisili),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        no_hp = VALUES(no_hp),
        catatan = VALUES(catatan),
        catatan_reject = VALUES(catatan_reject),
        status = VALUES(status),
        last_modified_at = VALUES(last_modified_at),
        last_modified_by = VALUES(last_modified_by)
    `;

    // 3. Eksekusi Query ( [values] dibungkus array lagi karena driver mysql2 meminta format ini untuk bulk insert)
    await db.query(query, [values]);

    res.status(200).json({ message: "Sinkronisasi data keluarga berhasil!" });
  } catch (error) {
    console.error("Error Sync Keluarga:", error);
    res.status(500).json({ message: "Gagal menyimpan data keluarga ke server", error: error.message });
  }
});

// Endpoint khusus untuk Approval Kadus (PUT /api/keluarga/approval/:id_keluarga)
router.put('/approval/:id_keluarga', async (req, res) => {
  const { id_keluarga } = req.params;
  const { status_baru, id_user_approver } = req.body; 
  // status_baru harus berupa 'approved' atau 'rejected'

  if (!['approved', 'rejected'].includes(status_baru)) {
    return res.status(400).json({ message: "Status tidak valid." });
  }

  try {
    const updateQuery = `
      UPDATE keluarga 
      SET status = ?, last_modified_by = ?, last_modified_at = NOW() 
      WHERE id_keluarga = ?
    `;
    const [result] = await db.query(updateQuery, [status_baru, id_user_approver, id_keluarga]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data keluarga tidak ditemukan." });
    }

    res.status(200).json({ message: `Data keluarga berhasil diubah menjadi ${status_baru}` });
  } catch (error) {
    console.error("Error Approval Kadus:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});


// Get keluarga dengan status submitted dan berdasarkan sls tertentu
router.get('/submitted/sls/:id_sls', async (req, res) => {
  const { id_sls } = req.params;

  try {
    const query = `
      SELECT 
        k.id_keluarga, 
        k.id_sls_administrasi,
        k.no_kk, 
        k.status_keberadaan,
        k.alamat,
        k.kesesuaian_domisili,
        k.no_hp,
        kk.nama AS nama_kepala_keluarga,
        k.status,
        k.catatan,
        k.latitude,
        k.longitude,
        s.nama_sls AS nama_sls,
        d.nama_dusun AS nama_dusun,
        ds.nama_desa AS nama_desa,
        COUNT(a.id_anggota_keluarga) AS jumlah_anggota
      FROM keluarga k

      JOIN anggota_keluarga kk 
          ON k.id_keluarga = kk.id_keluarga 
          AND kk.status_hubungan_keluarga = 'KEPALA KELUARGA'

      LEFT JOIN anggota_keluarga a 
          ON k.id_keluarga = a.id_keluarga

      JOIN sls s ON k.id_sls_administrasi = s.id_sls
      JOIN dusun d ON s.id_dusun = d.id_dusun
      JOIN desa ds ON d.id_desa = ds.id_desa

      WHERE k.id_sls_administrasi = ? AND k.status = 'submitted'

      GROUP BY 
          k.id_keluarga, 
          k.no_kk, 
          kk.nama,
          s.nama_sls,
          d.nama_dusun,
          ds.nama_desa;
    `;

    const [rows] = await db.query(query, [id_sls]);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});


router.get('/all', async (req, res) => {
  try {
    const query = `
      SELECT
        k.id_keluarga, 
        k.id_sls_administrasi,
        k.no_kk, 
        k.status_keberadaan,
        k.alamat,
        k.kesesuaian_domisili,
        k.no_hp,
        kk.nama AS nama_kepala_keluarga,
        k.status,
        k.catatan,
        k.latitude,
        k.longitude,
        s.nama_sls AS nama_sls,
        d.nama_dusun AS nama_dusun,
        ds.nama_desa AS nama_desa,
        COUNT(a.id_anggota_keluarga) AS jumlah_anggota
      FROM keluarga k

      JOIN anggota_keluarga kk 
          ON k.id_keluarga = kk.id_keluarga 
          AND kk.status_hubungan_keluarga = 'KEPALA KELUARGA'

      LEFT JOIN anggota_keluarga a 
          ON k.id_keluarga = a.id_keluarga

      JOIN sls s ON k.id_sls_administrasi = s.id_sls
      JOIN dusun d ON s.id_dusun = d.id_dusun
      JOIN desa ds ON d.id_desa = ds.id_desa

      GROUP BY 
          k.id_keluarga, 
          k.no_kk, 
          kk.nama,
          s.nama_sls,
          d.nama_dusun,
          ds.nama_desa;
    `;

    const [rows] = await db.query(query);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
  
})

module.exports = router;