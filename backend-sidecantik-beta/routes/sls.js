const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

router.get('/:id_sls', async (req, res) => {
  const { id_sls } = req.params;

  try {
    const query = `
      SELECT * FROM sls WHERE id_sls = ?
    `;

    const [rows] = await db.query(query, [id_sls]);
    
    res.json(rows);
  } catch (error) {
    console.error("Error fetching data keluarga:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

module.exports = router;