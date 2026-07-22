const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 1. Endpoint: Ambil semua anggota keluarga berdasarkan id_keluarga
// GET /api/penduduk/keluarga/:id_keluarga
router.get('/keluarga/:id_keluarga', async (req, res) => {
  const { id_keluarga } = req.params;
  try {
    const query = "SELECT * FROM anggota_keluarga WHERE id_keluarga = ?";
    const [rows] = await db.query(query, [id_keluarga]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching penduduk:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

// 2. Endpoint: Sinkronisasi data lokal ke server (Upsert massal)
// POST /api/penduduk/sync
router.post('/sync', async (req, res) => {
  const dataPenduduk = req.body;

  if (!dataPenduduk || dataPenduduk.length === 0) {
    return res.status(400).json({ message: "Tidak ada data penduduk untuk disinkronisasi." });
  }

  try {
    // 1. Mapping data dari JSON menjadi Array of Arrays
    const values = dataPenduduk.map(p => [
      p.id_anggota_keluarga || p.id_penduduk,
      p.id_keluarga,
      p.no_urut_anggota || null,
      p.nama || p.nama_lengkap || null,
      p.nik || null,
      p.status_hubungan_keluarga || null,
      p.detail_hubungan_keluarga_lainnya || null,
      p.status_penduduk || null,
      p.tempat_lahir || null,
      p.tanggal_lahir || null,
      p.jenis_kelamin || null,
      p.agama || null,
      p.status_perkawinan || null,
      p.pendidikan_tertinggi || null,
      p.pekerjaan || null,
      p.golongan_darah || null,
      p.nama_ayah || null,
      p.nama_ibu || null,
      p.status || null,
      p.last_modified_at || null,
      p.last_modified_by || null,
      p.status_dokumen || p.status_dokumen_blok3 || null,
    ]);

    // 2. Query UPSERT Penduduk
    const query = `
      INSERT INTO anggota_keluarga (
        id_anggota_keluarga, id_keluarga, no_urut_anggota, nama, nik, 
        status_hubungan_keluarga, detail_hubungan_keluarga_lainnya, status_penduduk, 
        tempat_lahir, tanggal_lahir, jenis_kelamin, agama, 
        status_perkawinan, pendidikan_tertinggi, pekerjaan, golongan_darah, 
        nama_ayah, nama_ibu, status, last_modified_at, last_modified_by, status_dokumen
      ) VALUES ?
      ON DUPLICATE KEY UPDATE 
        id_keluarga = VALUES(id_keluarga),
        no_urut_anggota = VALUES(no_urut_anggota),
        nama = VALUES(nama),
        nik = VALUES(nik),
        status_hubungan_keluarga = VALUES(status_hubungan_keluarga),
        detail_hubungan_keluarga_lainnya = VALUES(detail_hubungan_keluarga_lainnya),
        status_penduduk = VALUES(status_penduduk),
        tempat_lahir = VALUES(tempat_lahir),
        tanggal_lahir = VALUES(tanggal_lahir),
        jenis_kelamin = VALUES(jenis_kelamin),
        agama = VALUES(agama),
        status_perkawinan = VALUES(status_perkawinan),
        pendidikan_tertinggi = VALUES(pendidikan_tertinggi),
        pekerjaan = VALUES(pekerjaan),
        golongan_darah = VALUES(golongan_darah),
        nama_ayah = VALUES(nama_ayah),
        nama_ibu = VALUES(nama_ibu),
        status = VALUES(status),
        last_modified_at = VALUES(last_modified_at),
        last_modified_by = VALUES(last_modified_by),
        status_dokumen = 'submitted'
    `;

    // 3. Eksekusi Query
    await db.query(query, [values]);

    res.status(200).json({ message: "Sinkronisasi data penduduk berhasil!" });
  } catch (error) {
    console.error("Error Sync Penduduk:", error);
    res.status(500).json({ message: "Gagal menyimpan data penduduk ke server", error: error.message });
  }
});

router.get("/all", async (req, res) => {
  try{
    const query = `
      SELECT * FROM anggota_keluarga
    `;
    await db.query(query);
    res.status(200).json({ message: "Sinkronisasi data penduduk berhasil!" });
  } catch (error){
    console.error("Error fetching data anggota keluarga:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
})

module.exports = router;