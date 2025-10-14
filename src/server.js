const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error-handler');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const timelineRoutes = require('./routes/timeline');
const recommendationsRoutes = require('./routes/recommendations');
const qnaRoutes = require('./routes/qna');
const insightsRoutes = require('./routes/insights');

const app = express();

// Connect to database
connectDB(); 

// Trust proxy for rate limiting (if behind proxy/load balancer)
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin) {
      return callback(null, true); // allow REST tools or server-to-server calls with no origin
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.log('CORS Blocked: Origin not allowed:', origin);
        callback(new Error('Not allowed by CORS'), false);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Security middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), 
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), 
  message: { 
    success: false, 
    message: 'Too many requests from this IP, please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});
app.use('/api/', limiter); 

// Body parsers
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: accessLogStream }));
}

// Compression
app.use(compression());

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadDir}`);
}

// Serve static uploads
app.use('/uploads', express.static(uploadDir));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CareerVision API Server',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      resumes: '/api/resumes',
      timelines: '/api/timelines',
      recommendations: '/api/recommendations',
      qna: '/api/qna',
      health: '/api/health'
    }
  });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    success: true,
    status: 'OK',
    database: states[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path
  });
});

// Register API routes BEFORE 404 handler (order matters!)
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/timelines', timelineRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/qna', qnaRoutes);
app.use('/api/insights', insightsRoutes);

// 404 Handler (after all routes)
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/signup',
      'GET /api/resumes',
      'POST /api/resumes/upload',
      'GET /api/timelines',
      'POST /api/timelines',
      'GET /api/recommendations',
      'POST /api/recommendations',
      'POST /api/qna/ask',
      'GET /api/qna/history',
      'GET /api/insights/career',
      'GET /api/insights/analytics',
      'POST /api/insights/report'
    ]
  });
});

// Global error handler MUST be last middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
  console.log('\nAvailable routes:');
  console.log('  - POST /api/auth/login');
  console.log('  - POST /api/auth/signup');
  console.log('  - POST /api/resumes/upload');
  console.log('  - GET  /api/timelines');
  console.log('  - POST /api/qna/ask');
  console.log('  - GET  /api/qna/history');
  console.log('  - GET  /api/insights/career');
  console.log('  - GET  /api/insights/analytics');
  console.log('  - POST /api/insights/report');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, gracefully shutting down HTTP server');
  server.close(() => {
    console.log('HTTP server terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, gracefully shutting down HTTP server');
  server.close(() => {
    console.log('HTTP server terminated');
    process.exit(0);
  });
});

module.exports = app;
