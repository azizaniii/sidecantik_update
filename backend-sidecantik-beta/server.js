require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./middleware/auth');

const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const keluargaRoutes = require('./routes/keluarga');
const pendudukRoutes = require('./routes/penduduk');
const slsRoutes = require('./routes/sls');
const adminRoutes = require('./routes/admin');
const kependudukanRoutes = require('./routes/kependudukan');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: ['http://localhost:5173', 'https://kolaborasikehidupan.my.id', 'https://sidecantik.kolaborasikehidupan.my.id'] }));

app.use('/api/auth', authRoutes);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter);

app.use('/api/users', verifyToken, userRoutes);
app.use('/api/keluarga', verifyToken, keluargaRoutes);
app.use('/api/penduduk', verifyToken, pendudukRoutes);
app.use('/api/sls', verifyToken, slsRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/kependudukan', verifyToken, kependudukanRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server berjalan dengan rapi dan aman di port ${PORT}`);
});
