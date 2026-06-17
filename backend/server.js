const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const billingRoutes = require('./routes/billingRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const labRoutes = require('./routes/labRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
app.use(cors());
app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());

// API Base Check
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
      users: '/api/users',
      doctors: '/api/doctors',
      patients: '/api/patients',
      appointments: '/api/appointments',
      billing: '/api/billing',
      medicines: '/api/medicines',
      labTests: '/api/lab-tests'
    }
  });
});

// Route Mountings
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/medicines', pharmacyRoutes);
app.use('/api/lab-tests', labRoutes);

// Unhandled Route Handler
app.use((req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global Error Handler
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`[OK] Express Server listening on port ${PORT}`);
  console.log(`[OK] API available at http://localhost:${PORT}/api`);
});
