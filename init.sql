-- =========================================================
-- SIDECANTIK — init.sql
-- Struktur database + data wilayah awal + akun SUPERADMIN sementara
-- Dibuat dari struktur database development pada 24 Juli 2026
-- =========================================================
--
-- CARA PAKAI:
--   mysql -u root -p < init.sql
--
-- File ini akan:
--   1. Membuat database `sidecantik` (kalau belum ada)
--   2. Membuat user aplikasi `sidecantik_app` dengan privilege terbatas
--      HANYA ke database `sidecantik` (bukan privilege global seperti di dev)
--   3. Membuat seluruh tabel
--   4. Mengisi data wilayah (desa/dusun/SLS) yang sudah ada
--   5. Membuat satu akun SUPERADMIN sementara untuk login pertama kali
--
-- ⚠️ WAJIB: Ganti 'GANTI_PASSWORD_INI' di bagian CREATE USER di bawah
-- dengan password baru sebelum menjalankan file ini di production.
-- Password 'adminganteng' HANYA dipakai untuk akun SUPERADMIN aplikasi
-- (login ke web), BUKAN password database — dan wajib diganti lewat
-- halaman aplikasi segera setelah login pertama kali.
-- =========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. DATABASE & USER
-- =========================================================
CREATE DATABASE IF NOT EXISTS `sidecantik`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Ganti 'GANTI_PASSWORD_INI' sebelum dijalankan di production.
CREATE USER IF NOT EXISTS 'sidecantik_app'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_INI';

-- Privilege dibatasi HANYA ke database sidecantik (bukan *.* seperti di dev).
-- Tidak diberi PROCESS/SUPER/FILE agar tidak bisa dipakai untuk hal di luar
-- kebutuhan aplikasi (mysqldump struktur tabel tetap bisa tanpa privilege ini,
-- gunakan opsi --no-tablespaces).
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON `sidecantik`.* TO 'sidecantik_app'@'localhost';

FLUSH PRIVILEGES;

USE `sidecantik`;

-- =========================================================
-- 2. STRUKTUR TABEL
-- Urutan dibuat sesuai dependency foreign key: tabel independen dulu
-- (desa), lalu tabel yang bergantung padanya (dusun -> sls -> keluarga
-- -> penduduk/anggota_keluarga), baru tabel pendukung (users, log).
-- =========================================================

DROP TABLE IF EXISTS `wilayah_tugas`;
DROP TABLE IF EXISTS `keluarga_approval_log`;
DROP TABLE IF EXISTS `sql_audit_log`;
DROP TABLE IF EXISTS `anggota_keluarga`;
DROP TABLE IF EXISTS `penduduk`;
DROP TABLE IF EXISTS `keluarga`;
DROP TABLE IF EXISTS `sls`;
DROP TABLE IF EXISTS `dusun`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `desa`;

-- ---------------------------------------------------------
-- desa
-- ---------------------------------------------------------
CREATE TABLE `desa` (
  `id_desa` char(36) NOT NULL,
  `nama_desa` varchar(100) NOT NULL,
  PRIMARY KEY (`id_desa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- dusun
-- ---------------------------------------------------------
CREATE TABLE `dusun` (
  `id_dusun` char(36) NOT NULL,
  `nama_dusun` varchar(100) NOT NULL,
  `id_desa` char(36) DEFAULT NULL,
  PRIMARY KEY (`id_dusun`),
  KEY `id_desa` (`id_desa`),
  CONSTRAINT `dusun_ibfk_1` FOREIGN KEY (`id_desa`) REFERENCES `desa` (`id_desa`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- sls
-- ---------------------------------------------------------
CREATE TABLE `sls` (
  `id_sls` char(36) NOT NULL,
  `nama_sls` varchar(100) NOT NULL,
  `id_dusun` char(36) DEFAULT NULL,
  PRIMARY KEY (`id_sls`),
  KEY `id_dusun` (`id_dusun`),
  CONSTRAINT `sls_ibfk_1` FOREIGN KEY (`id_dusun`) REFERENCES `dusun` (`id_dusun`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- users
-- ---------------------------------------------------------
CREATE TABLE `users` (
  `id_user` char(36) NOT NULL,
  `email` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(255) NOT NULL,
  `nama` varchar(150) NOT NULL,
  `role` enum('KETUA RT','KEPALA DUSUN','SEKRETARIS DESA','KEPALA DESA','AGEN STATISTIK','OPERATOR SID','SUPERADMIN') NOT NULL,
  `id_desa` char(36) DEFAULT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `username` (`email`) USING BTREE,
  KEY `fk_users_desa` (`id_desa`),
  CONSTRAINT `fk_users_desa` FOREIGN KEY (`id_desa`) REFERENCES `desa` (`id_desa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- keluarga
-- ---------------------------------------------------------
CREATE TABLE `keluarga` (
  `id_keluarga` char(36) NOT NULL,
  `no_kk` varchar(16) NOT NULL,
  `id_sls_administrasi` char(36) DEFAULT NULL,
  `nama_kepala_keluarga` varchar(255) DEFAULT NULL,
  `status_keberadaan` enum('Ditemukan','Baru','Pindah Keluar SLS','Tidak Ditemukan','Tidak Tahu') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `alamat` text,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `no_hp` varchar(20) DEFAULT NULL,
  `last_modified_at` datetime DEFAULT NULL,
  `last_modified_by` char(36) DEFAULT NULL,
  `catatan` text,
  `catatan_reject` text,
  `kesesuaian_domisili` enum('ALAMAT KK DAN DOMISILI SESUAI SLS','ALAMAT KK DILUAR SLS','DOMISILI DILUAR SLS') DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_keluarga`),
  UNIQUE KEY `no_kk` (`no_kk`),
  KEY `id_sls_administrasi` (`id_sls_administrasi`),
  CONSTRAINT `keluarga_ibfk_1` FOREIGN KEY (`id_sls_administrasi`) REFERENCES `sls` (`id_sls`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- penduduk
-- ---------------------------------------------------------
CREATE TABLE `penduduk` (
  `id_penduduk` char(36) NOT NULL,
  `nik` varchar(16) NOT NULL,
  `nama` varchar(150) NOT NULL,
  `tempat_lahir` varchar(100) DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `umur` int DEFAULT NULL,
  `golongan_darah` enum('A','B','O','AB','TIDAK TAHU') DEFAULT NULL,
  `nama_ayah` varchar(150) DEFAULT NULL,
  `nama_ibu` varchar(150) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `id_keluarga` char(36) DEFAULT NULL,
  `id_sls_domisili` char(36) DEFAULT NULL,
  `pendidikan_tertinggi` enum('Tidak/Belum Sekolah','Belum Tamat SD/Sederajat','Tamat SD/Sederajat','SMP/Sederajat','SMA/Sederajat','Diploma I/II','Akademi/Diploma III','Diploma IV/Strata I (S1)','Strata II (S2)','Strata III (S3)') DEFAULT NULL,
  `pekerjaan` enum('Belum/Tidak Bekerja','Mengurus Rumah Tangga','Pelajar/Mahasiswa','Pensiunan','ASN (Aparatur Sipil Negara)','Tentara Nasional Indonesia (TNI)','Kepolisian RI (POLRI)','Wiraswasta/Pedagang','Petani/Pekebun','Nelayan/Perikanan','Karyawan Swasta','Karyawan Honorer','Buruh Harian Lepas','Tenaga Kerja Indonesia (TKI)','Lainnya') DEFAULT NULL,
  `status_perkawinan` enum('Belum Kawin','Kawin','Cerai Hidup','Cerai Mati') DEFAULT NULL,
  `status_hubungan_keluarga` enum('Kepala Keluarga','Istri/Suami','Anak','Cucu','Orang Tua','Famili Lain','Mertua','Pembantu','Lainnya') DEFAULT NULL,
  `jenis_kelamin` enum('Laki-laki','Perempuan') DEFAULT NULL,
  `agama` enum('Islam','Kristen','Katolik','Hindu','Budha','Konghucu','Kepercayaan Lain') DEFAULT NULL,
  `no_urut_anggota` int DEFAULT NULL,
  `detail_hubungan_keluarga_lainnya` varchar(255) DEFAULT NULL,
  `last_modified_at` datetime DEFAULT NULL,
  `last_modified_by` char(36) DEFAULT NULL,
  PRIMARY KEY (`id_penduduk`),
  UNIQUE KEY `nik` (`nik`),
  KEY `id_keluarga` (`id_keluarga`),
  KEY `id_sls_domisili` (`id_sls_domisili`),
  CONSTRAINT `penduduk_ibfk_1` FOREIGN KEY (`id_keluarga`) REFERENCES `keluarga` (`id_keluarga`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `penduduk_ibfk_2` FOREIGN KEY (`id_sls_domisili`) REFERENCES `sls` (`id_sls`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- anggota_keluarga
-- ---------------------------------------------------------
CREATE TABLE `anggota_keluarga` (
  `id_anggota_keluarga` char(36) NOT NULL,
  `nik` varchar(50) DEFAULT NULL,
  `nama` varchar(255) DEFAULT NULL,
  `pendidikan_tertinggi` enum('TIDAK/BELUM SEKOLAH','BELUM TAMAT SD/SEDERAJAT','TAMAT SD/SEDERAJAT','SMP/SEDERAJAT','SMA/SEDERAJAT','DIPLOMA I/II','AKADEMI/DIPLOMA III','DIPLOMA IV/STRATA I (S1)','STRATA II (S2)','STRATA III (S3)') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `pekerjaan` enum('BELUM/TIDAK BEKERJA','MENGURUS RUMAH TANGGA','PELAJAR/MAHASISWA','PENSIUNAN','ASN (APARATUR SIPIL NEGARA)','TENTARA NASIONAL INDONESIA (TNI)','KEPOLISIAN RI (POLRI)','WIRASWASTA/PEDAGANG','PETANI/PEKEBUN','NELAYAN/PERIKANAN','KARYAWAN SWASTA','KARYAWAN HONORER','BURUH HARIAN LEPAS','TENAGA KERJA INDONESIA (TKI)','LAINNYA') DEFAULT NULL,
  `tempat_lahir` varchar(100) DEFAULT NULL,
  `tanggal_lahir` date DEFAULT NULL,
  `umur` int DEFAULT NULL,
  `status_perkawinan` enum('BELUM KAWIN','KAWIN','CERAI HIDUP','CERAI MATI') DEFAULT NULL,
  `status_hubungan_keluarga` enum('KEPALA KELUARGA','ISTRI/SUAMI','ANAK','CUCU','ORANG TUA','FAMILI LAIN','MERTUA','PEMBANTU','LAINNYA') DEFAULT NULL,
  `detail_hubungan_keluarga_lainnya` varchar(255) DEFAULT NULL,
  `golongan_darah` enum('A','B','O','AB','TIDAK TAHU') DEFAULT NULL,
  `nama_ayah` varchar(255) DEFAULT NULL,
  `nama_ibu` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `id_keluarga` char(36) DEFAULT NULL,
  `no_urut_anggota` int DEFAULT NULL,
  `jenis_kelamin` enum('LAKI-LAKI','PEREMPUAN') DEFAULT NULL,
  `agama` enum('ISLAM','KRISTEN','KATOLIK','HINDU','BUDHA','KONGHUCU','KEPERCAYAAN LAIN') DEFAULT NULL,
  `id_sls_domisili` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status_penduduk` enum('HIDUP','MATI','TINGGAL DILUAR SLS','TIDAK DITEMUKAN') DEFAULT NULL,
  `last_modified_by` char(36) DEFAULT NULL,
  `last_modified_at` datetime DEFAULT NULL,
  `status_dokumen` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_anggota_keluarga`),
  UNIQUE KEY `nik` (`nik`),
  KEY `fk_keluarga` (`id_keluarga`),
  KEY `fk_sls_domisili` (`id_sls_domisili`) USING BTREE,
  CONSTRAINT `fk_keluarga` FOREIGN KEY (`id_keluarga`) REFERENCES `keluarga` (`id_keluarga`) ON DELETE CASCADE,
  CONSTRAINT `fk_sls_domisili` FOREIGN KEY (`id_sls_domisili`) REFERENCES `sls` (`id_sls`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- keluarga_approval_log
-- ---------------------------------------------------------
CREATE TABLE `keluarga_approval_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_keluarga` char(36) NOT NULL,
  `id_user` char(36) NOT NULL,
  `nama_user` varchar(150) NOT NULL,
  `role` varchar(50) NOT NULL,
  `status_sebelum` varchar(50) DEFAULT NULL,
  `status_sesudah` varchar(50) NOT NULL,
  `catatan` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- sql_audit_log
-- ---------------------------------------------------------
CREATE TABLE `sql_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_user` char(36) NOT NULL,
  `nama_user` varchar(150) NOT NULL,
  `role` varchar(50) NOT NULL,
  `statement_type` varchar(20) NOT NULL,
  `query_text` text NOT NULL,
  `success` tinyint(1) NOT NULL,
  `error_message` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `executed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------
-- wilayah_tugas
-- ---------------------------------------------------------
CREATE TABLE `wilayah_tugas` (
  `id_wilayah_tugas` char(36) NOT NULL,
  `id_user` char(36) NOT NULL,
  `id_sls` char(36) NOT NULL,
  PRIMARY KEY (`id_wilayah_tugas`),
  KEY `id_user` (`id_user`),
  KEY `id_sls` (`id_sls`),
  CONSTRAINT `wilayah_tugas_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  CONSTRAINT `wilayah_tugas_ibfk_2` FOREIGN KEY (`id_sls`) REFERENCES `sls` (`id_sls`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =========================================================
-- 3. DATA WILAYAH AWAL (desa, dusun, sls)
-- Disalin dari data yang sudah berjalan di lingkungan development.
-- =========================================================

INSERT INTO `desa` (`id_desa`, `nama_desa`) VALUES
('51b13956-77cc-11f1-b9dd-00090ffe0001', 'MEDANA'),
('51b27fe4-77cc-11f1-b9dd-00090ffe0001', 'JENGGALA'),
('51b28375-77cc-11f1-b9dd-00090ffe0001', 'SAMAGUNA');

INSERT INTO `dusun` (`id_dusun`, `nama_dusun`, `id_desa`) VALUES
('b88bddf9-77cc-11f1-b9dd-00090ffe0001', 'GOL', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88be645-77cc-11f1-b9dd-00090ffe0001', 'JAMBIANOM', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88be94a-77cc-11f1-b9dd-00090ffe0001', 'KARANG ANYAR', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88beb71-77cc-11f1-b9dd-00090ffe0001', 'KOPANG', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88bed50-77cc-11f1-b9dd-00090ffe0001', 'MURSODO', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88bf10e-77cc-11f1-b9dd-00090ffe0001', 'NUSANTARA', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88bf2d4-77cc-11f1-b9dd-00090ffe0001', 'ORONG KOPANG', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88bf525-77cc-11f1-b9dd-00090ffe0001', 'ORONG RAMPUT', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88bf6f9-77cc-11f1-b9dd-00090ffe0001', 'TELUK DALAM', '51b13956-77cc-11f1-b9dd-00090ffe0001'),
('b88bf8c2-77cc-11f1-b9dd-00090ffe0001', 'TELUK DALEM KERN', '51b13956-77cc-11f1-b9dd-00090ffe0001');

INSERT INTO `sls` (`id_sls`, `nama_sls`, `id_dusun`) VALUES
('1d3ac42e-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN GOL', 'b88bddf9-77cc-11f1-b9dd-00090ffe0001'),
('1d3ad1c7-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN GOL', 'b88bddf9-77cc-11f1-b9dd-00090ffe0001'),
('1d3ad393-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN GOL', 'b88bddf9-77cc-11f1-b9dd-00090ffe0001'),
('1d3ad47d-7819-11f1-b9dd-00090ffe0001', 'RT 04 DUSUN GOL', 'b88bddf9-77cc-11f1-b9dd-00090ffe0001'),
('1d3ad55b-7819-11f1-b9dd-00090ffe0001', 'RT 05 DUSUN GOL', 'b88bddf9-77cc-11f1-b9dd-00090ffe0001'),
('1d3ad63a-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN JAMBIANOM', 'b88be645-77cc-11f1-b9dd-00090ffe0001'),
('1d3ad708-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN JAMBIANOM', 'b88be645-77cc-11f1-b9dd-00090ffe0001'),
('1d3ad7d3-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN JAMBIANOM', 'b88be645-77cc-11f1-b9dd-00090ffe0001'),
('1d3ada04-7819-11f1-b9dd-00090ffe0001', 'RT 04 DUSUN JAMBIANOM', 'b88be645-77cc-11f1-b9dd-00090ffe0001'),
('1d3adad3-7819-11f1-b9dd-00090ffe0001', 'RT 05 DUSUN JAMBIANOM', 'b88be645-77cc-11f1-b9dd-00090ffe0001'),
('1d3adcbf-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN KARANG ANYAR', 'b88be94a-77cc-11f1-b9dd-00090ffe0001'),
('1d3ae0a5-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN KARANG ANYAR', 'b88be94a-77cc-11f1-b9dd-00090ffe0001'),
('1d3ae2c4-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN KARANG ANYAR', 'b88be94a-77cc-11f1-b9dd-00090ffe0001'),
('1d3ae477-7819-11f1-b9dd-00090ffe0001', 'RT 04 DUSUN KARANG ANYAR', 'b88be94a-77cc-11f1-b9dd-00090ffe0001'),
('1d3ae66e-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN KOPANG', 'b88beb71-77cc-11f1-b9dd-00090ffe0001'),
('1d3ae857-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN KOPANG', 'b88beb71-77cc-11f1-b9dd-00090ffe0001'),
('1d3aea13-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN KOPANG', 'b88beb71-77cc-11f1-b9dd-00090ffe0001'),
('1d3aebc7-7819-11f1-b9dd-00090ffe0001', 'RT 04 DUSUN KOPANG', 'b88beb71-77cc-11f1-b9dd-00090ffe0001'),
('1d3aed6e-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN MURSODO', 'b88bed50-77cc-11f1-b9dd-00090ffe0001'),
('1d3aef1b-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN MURSODO', 'b88bed50-77cc-11f1-b9dd-00090ffe0001'),
('1d3af0c0-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN MURSODO', 'b88bed50-77cc-11f1-b9dd-00090ffe0001'),
('1d3af7da-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN NUSANTARA', 'b88bf10e-77cc-11f1-b9dd-00090ffe0001'),
('1d3afa17-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN NUSANTARA', 'b88bf10e-77cc-11f1-b9dd-00090ffe0001'),
('1d3afbd4-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN NUSANTARA', 'b88bf10e-77cc-11f1-b9dd-00090ffe0001'),
('1d3afe58-7819-11f1-b9dd-00090ffe0001', 'RT 04 DUSUN NUSANTARA', 'b88bf10e-77cc-11f1-b9dd-00090ffe0001'),
('1d3b005c-7819-11f1-b9dd-00090ffe0001', 'RT 05 DUSUN NUSANTARA', 'b88bf10e-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0119-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN ORONG KOPANG', 'b88bf2d4-77cc-11f1-b9dd-00090ffe0001'),
('1d3b01cc-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN ORONG KOPANG', 'b88bf2d4-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0295-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN ORONG RAMPUT', 'b88bf525-77cc-11f1-b9dd-00090ffe0001'),
('1d3b033f-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN ORONG RAMPUT', 'b88bf525-77cc-11f1-b9dd-00090ffe0001'),
('1d3b03e6-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN ORONG RAMPUT', 'b88bf525-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0689-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN TELUK DALAM', 'b88bf6f9-77cc-11f1-b9dd-00090ffe0001'),
('1d3b08f0-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN TELUK DALAM', 'b88bf6f9-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0abc-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN TELUK DALAM', 'b88bf6f9-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0c74-7819-11f1-b9dd-00090ffe0001', 'RT 04 DUSUN TELUK DALAM', 'b88bf6f9-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0e19-7819-11f1-b9dd-00090ffe0001', 'RT 05 DUSUN TELUK DALAM', 'b88bf6f9-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0ec7-7819-11f1-b9dd-00090ffe0001', 'RT 01 DUSUN TELUK DALEM KERN', 'b88bf8c2-77cc-11f1-b9dd-00090ffe0001'),
('1d3b0f7d-7819-11f1-b9dd-00090ffe0001', 'RT 02 DUSUN TELUK DALEM KERN', 'b88bf8c2-77cc-11f1-b9dd-00090ffe0001'),
('1d3b1027-7819-11f1-b9dd-00090ffe0001', 'RT 03 DUSUN TELUK DALEM KERN', 'b88bf8c2-77cc-11f1-b9dd-00090ffe0001'),
('1d3b10fc-7819-11f1-b9dd-00090ffe0001', 'RT 04 DUSUN TELUK DALEM KERN', 'b88bf8c2-77cc-11f1-b9dd-00090ffe0001');


-- =========================================================
-- 4. AKUN SUPERADMIN SEMENTARA
-- Email   : superadmin@sidecantik.local
-- Password: adminganteng   (hash bcrypt cost 10 di bawah)
--
-- ⚠️ WAJIB diganti lewat aplikasi (ubah password) SEGERA setelah
-- login pertama kali di production. Jangan biarkan password ini
-- aktif dalam jangka panjang, terutama karena sudah pernah tertulis
-- di riwayat chat/dev.
-- =========================================================

INSERT INTO `users` (`id_user`, `email`, `password`, `nama`, `role`, `id_desa`) VALUES
(UUID(), 'superadmin@sidecantik.local', '$2b$10$f4HLWas.gn.2VxXNg9XkwOvCCczzI053SvL2d/myCDZdtkt6NkX3a', 'Super Admin', 'SUPERADMIN', NULL);


SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- SELESAI
-- Langkah selanjutnya:
--   1. Ganti 'GANTI_PASSWORD_INI' di atas dengan password kuat sebelum
--      dijalankan (atau ALTER USER setelahnya).
--   2. Login sebagai superadmin@sidecantik.local / adminganteng
--   3. Ganti password superadmin lewat aplikasi.
--   4. Buat akun operasional lain (Kadus, Sekdes, Kades, dst) lewat
--      aplikasi atau SQL Console.
-- =========================================================
