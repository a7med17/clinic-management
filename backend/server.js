// Application composition root: configures cross-cutting middleware and mounts every API area.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load backend-only secrets before any module reads configuration values.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const doctorPortalRoutes = require('./routes/doctorPortalRoutes');
const patientPortalRoutes = require('./routes/patientPortalRoutes');
const receptionRoutes = require('./routes/receptionRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const billingRoutes = require('./routes/billingRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const labRoutes = require('./routes/labRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');
const createRateLimiter = require('./middleware/rateLimitMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const authRateLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10
});

// Apply security, request logging, and JSON parsing to every endpoint before route handling.
app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== 'production' || configuredOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS policy.');
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '100kb' }));

// Lightweight health/discovery endpoints; they do not expose protected data.
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Hospital & Clinic Management API is running',
    version: '2.0.0'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Hospital & Clinic Management System API',
    endpoints: {
      auth: '/api/auth',
      admin: '/api/admin',
      users: '/api/users',
      doctors: '/api/doctors',
      doctor: '/api/doctor',
      patient: '/api/patient',
      reception: '/api/reception',
      patients: '/api/patients',
      appointments: '/api/appointments',
      billing: '/api/billing',
      medicines: '/api/medicines',
      labTests: '/api/lab-tests'
    }
  });
});

// Each route module owns one resource or role-specific portal. Individual modules add their own authorization gates.
// Authentication entry points are rate-limited separately from authenticated profile requests.
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/doctor', doctorPortalRoutes);
app.use('/api/patient', patientPortalRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/medicines', pharmacyRoutes);
app.use('/api/lab-tests', labRoutes);
app.use('/api/lab', labRoutes.labQueueRouter);

// Convert unmatched requests into the same error flow used by controllers.
app.use((req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// This must remain last so Express forwards errors from every preceding handler here.
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`[OK] Express Server listening on port ${PORT}`);
  console.log(`[OK] API available at http://localhost:${PORT}/api`);
});
