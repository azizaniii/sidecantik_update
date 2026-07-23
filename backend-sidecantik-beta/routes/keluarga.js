const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireRole } = require('../middleware/auth');

// Helper: catat setiap perubahan status ke tabel log
async function catatLogApproval({ id_keluarga, id_user, nama_user, role, status_sebelum, status_sesudah, catatan }) {
  try {
    await db.query(
      `INSERT INTO keluarga_approval_log (id_keluarga, id_user, nama_user, role, status_sebelum, status_sesudah, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_keluarga, id_user, nama_user, role, status_sebelum || null, status_sesudah, catatan || null]
    );
  } catch (err) {
    console.error('Gagal mencatat log approval:', err.message);
  }
}

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

  if (!dataKeluarga || dataKeluarga.length === 0) {
    return res.status(400).json({ message: "Tidak ada data keluarga untuk disinkronisasi." });
  }

  try {
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

    await db.query(query, [values]);

    res.status(200).json({ message: "Sinkronisasi data keluarga berhasil!" });
  } catch (error) {
    console.error("Error Sync Keluarga:", error);
    res.status(500).json({ message: "Gagal menyimpan data keluarga ke server", error: error.message });
  }
});

// ==========================================================
// APPROVAL BERJENJANG (v2)
// open/draft -> submitted -> menunggu_sekdes -> menunggu_kades -> disetujui
//
// Ditolak di tahap manapun -> status "ditolak_<tahap>" tersendiri, balik ke
// pemilik tahap sebelumnya untuk diproses ulang:
//   ditolak_kadus  -> balik ke Operator/RT untuk direvisi dari awal (status ini
//                     ditangani lewat alur form biasa, bukan endpoint approval)
//   ditolak_sekdes -> balik ke Kadus, diproses ulang lewat approval-kadus
//                     (statusDiproses bisa 'submitted' ATAU 'ditolak_sekdes')
//   ditolak_kades  -> balik ke Sekdes, diproses ulang lewat approval-sekdes
//                     (statusDiproses bisa 'menunggu_sekdes' ATAU 'ditolak_kades')
// ==========================================================

const TAHAP_APPROVAL = {
  kadus: {
    // Kadus memproses data yang baru disubmit RT, ATAU data yang tadinya sudah
    // lolos ke Sekdes lalu ditolak Sekdes dan dikembalikan ke Kadus
    statusDiproses: ['submitted', 'ditolak_sekdes'],
    statusApprove: 'menunggu_sekdes',
    statusReject: 'ditolak_kadus', // balik ke Operator/RT untuk direvisi dari awal
    rolesDiizinkan: ['SUPERADMIN', 'KEPALA DUSUN'],
  },
  sekdes: {
    // Sekdes memproses data yang baru lolos Kadus, ATAU data yang tadinya sudah
    // lolos ke Kades lalu ditolak Kades dan dikembalikan ke Sekdes
    statusDiproses: ['menunggu_sekdes', 'ditolak_kades'],
    statusApprove: 'menunggu_kades',
    statusReject: 'ditolak_sekdes', // balik ke tahap Kadus
    rolesDiizinkan: ['SUPERADMIN', 'SEKRETARIS DESA'],
  },
  kades: {
    statusDiproses: ['menunggu_kades'],
    statusApprove: 'disetujui',
    statusReject: 'ditolak_kades', // balik ke tahap Sekdes
    rolesDiizinkan: ['SUPERADMIN', 'KEPALA DESA'],
  },
};

function buatEndpointApprovalTahap(namaTahap) {
  const config = TAHAP_APPROVAL[namaTahap];
  // Placeholder SQL "?" sejumlah kemungkinan status yang diproses tahap ini
  const placeholderStatus = config.statusDiproses.map(() => '?').join(', ');

  // Single approval
  router.put(`/approval-${namaTahap}/:id_keluarga`, requireRole(...config.rolesDiizinkan), async (req, res) => {
    const { id_keluarga } = req.params;
    const { aksi, catatan } = req.body; // aksi: 'terima' | 'tolak'
    const { id_user, nama, role } = req.user;

    if (!['terima', 'tolak'].includes(aksi)) {
      return res.status(400).json({ success: false, message: "Aksi tidak valid." });
    }

    const statusBaru = aksi === 'terima' ? config.statusApprove : config.statusReject;

    try {
      const [result] = await db.query(
        `UPDATE keluarga SET status = ?, last_modified_by = ?, last_modified_at = NOW()
         WHERE id_keluarga = ? AND status IN (${placeholderStatus})`,
        [statusBaru, id_user, id_keluarga, ...config.statusDiproses]
      );

      if (result.affectedRows === 0) {
        return res.status(409).json({
          success: false,
          message: `Data tidak ditemukan atau statusnya sudah berubah (bukan lagi salah satu dari: ${config.statusDiproses.join(', ')}).`,
        });
      }

      await catatLogApproval({
        id_keluarga, id_user, nama_user: nama, role,
        status_sebelum: config.statusDiproses.join('|'), status_sesudah: statusBaru, catatan,
      });

      res.status(200).json({ success: true, message: `Data berhasil diubah menjadi ${statusBaru}` });
    } catch (error) {
      console.error(`Error approval-${namaTahap}:`, error);
      res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
    }
  });

  // Bulk approval — proses sebanyak mungkin, laporkan yang gagal
  router.put(`/approval-${namaTahap}-bulk`, requireRole(...config.rolesDiizinkan), async (req, res) => {
    const { id_keluarga_list, aksi, catatan } = req.body;
    const { id_user, nama, role } = req.user;

    if (!['terima', 'tolak'].includes(aksi)) {
      return res.status(400).json({ success: false, message: "Aksi tidak valid." });
    }
    if (!Array.isArray(id_keluarga_list) || id_keluarga_list.length === 0) {
      return res.status(400).json({ success: false, message: "Daftar id_keluarga tidak boleh kosong." });
    }
    if (id_keluarga_list.length > 200) {
      return res.status(400).json({ success: false, message: "Maksimal 200 data per proses bulk." });
    }

    const statusBaru = aksi === 'terima' ? config.statusApprove : config.statusReject;
    const berhasil = [];
    const gagal = [];

    for (const id_keluarga of id_keluarga_list) {
      try {
        const [result] = await db.query(
          `UPDATE keluarga SET status = ?, last_modified_by = ?, last_modified_at = NOW()
           WHERE id_keluarga = ? AND status IN (${placeholderStatus})`,
          [statusBaru, id_user, id_keluarga, ...config.statusDiproses]
        );
        if (result.affectedRows === 0) {
          gagal.push({ id_keluarga, alasan: `Bukan lagi salah satu dari status: ${config.statusDiproses.join(', ')}` });
        } else {
          await catatLogApproval({
            id_keluarga, id_user, nama_user: nama, role,
            status_sebelum: config.statusDiproses.join('|'), status_sesudah: statusBaru, catatan,
          });
          berhasil.push(id_keluarga);
        }
      } catch (error) {
        console.error(`Error approval-${namaTahap}-bulk untuk ${id_keluarga}:`, error);
        gagal.push({ id_keluarga, alasan: error.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Berhasil memproses ${berhasil.length} dari ${id_keluarga_list.length} data.`,
      berhasil,
      gagal,
    });
  });
}

buatEndpointApprovalTahap('kadus');
buatEndpointApprovalTahap('sekdes');
buatEndpointApprovalTahap('kades');

// ==========================================================
// ENDPOINT FETCH DATA UNTUK SINKRONISASI, DIBEDAKAN PER ROLE
// ==========================================================

// Status yang dilihat Kadus: semua tahap KECUALI open/draft (yang masih
// murni pekerjaan RT dan belum pernah disubmit)
const STATUS_UNTUK_KADUS = [
  'submitted',
  'menunggu_sekdes',
  'menunggu_kades',
  'disetujui',
  'ditolak_kadus',
  'ditolak_sekdes',
  'ditolak_kades',
];

// Query dasar yang dipakai berulang untuk mengambil data keluarga + relasi wilayah
function queryDasarKeluarga(whereClause) {
  return `
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

    WHERE ${whereClause}

    GROUP BY
        k.id_keluarga,
        k.no_kk,
        kk.nama,
        s.nama_sls,
        d.nama_dusun,
        ds.nama_desa;
  `;
}

// Endpoint untuk Kadus: semua status kecuali open/draft, dibatasi per-SLS (wilayah kerjanya)
// GET /api/keluarga/kadus/sls/:id_sls
router.get('/kadus/sls/:id_sls', requireRole('SUPERADMIN', 'KEPALA DUSUN'), async (req, res) => {
  const { id_sls } = req.params;
  const placeholderStatus = STATUS_UNTUK_KADUS.map(() => '?').join(', ');

  try {
    const query = queryDasarKeluarga(`k.id_sls_administrasi = ? AND k.status IN (${placeholderStatus})`);
    const [rows] = await db.query(query, [id_sls, ...STATUS_UNTUK_KADUS]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga untuk kadus:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

// Endpoint untuk Sekdes & Kades: SEMUA status (termasuk open/draft), dibatasi per-desa
// GET /api/keluarga/desa/:id_desa
router.get('/desa/:id_desa', requireRole('SUPERADMIN', 'SEKRETARIS DESA', 'KEPALA DESA'), async (req, res) => {
  const { id_desa } = req.params;

  // Role selain SUPERADMIN wajib id_desa dari token sendiri (tidak boleh intip desa lain)
  if (req.user.role !== 'SUPERADMIN' && req.user.id_desa !== id_desa) {
    return res.status(403).json({ error: "Anda tidak memiliki akses ke desa ini." });
  }

  try {
    const query = queryDasarKeluarga(`ds.id_desa = ?`);
    const [rows] = await db.query(query, [id_desa]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga untuk sekdes/kades:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

// Get keluarga dengan status submitted dan berdasarkan sls tertentu
// (dipertahankan untuk kompatibilitas, dipakai di alur lain selain approval Kadus)
router.get('/submitted/sls/:id_sls', async (req, res) => {
  const { id_sls } = req.params;

  try {
    const query = queryDasarKeluarga(`k.id_sls_administrasi = ? AND k.status = 'submitted'`);
    const [rows] = await db.query(query, [id_sls]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});


router.get('/all', async (req, res) => {
  try {
    const query = queryDasarKeluarga('1 = 1');
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
})

module.exports = router;
