const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password harus diisi" });
  }
  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: "Email atau password salah" });
    }
    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Email atau password salah" });
    }
    const [wilayahTugas] = await db.query(
      "SELECT id_sls FROM wilayah_tugas WHERE id_user = ?",
      [user.id_user]
    );
    const daftar_sls = wilayahTugas.map(tugas => tugas.id_sls);

    const tokenPayload = {
      id_user: user.id_user,
      nama: user.nama,
      email: user.email,
      role: user.role,
      daftar_sls: daftar_sls
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.status(200).json({
      message: "Login berhasil",
      token,
      user: {
        id_user: user.id_user,
        nama: user.nama,
        email: user.email,
        daftar_sls: daftar_sls,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Error saat login:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
});

module.exports = router;
