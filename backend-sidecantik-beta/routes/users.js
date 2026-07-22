const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Endpoint: Mengambil semua user (GET /api/users)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id_user, nama, role FROM users");
    res.json(rows);
  } catch (error) {
    console.error("Detail Error MySQL:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

// Endpoint: Mengambil satu user berdasarkan ID (GET /api/users/:id)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id_user, nama FROM users WHERE id = ?", [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }
    
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

// Endpoint: Menambah user baru (POST /api/users)
router.post('/', async (req, res) => {
  const { nama } = req.body;
  if (!nama) return res.status(400).json({ message: "Nama harus diisi" });

  try {
    const [result] = await db.query("INSERT INTO users (nama) VALUES (?)", [nama]);
    res.status(201).json({ id: result.insertId, nama, message: "User berhasil ditambahkan" });
  } catch (error) {
    res.status(500).json({ error: "Gagal menambahkan user" });
  }
});


module.exports = router;