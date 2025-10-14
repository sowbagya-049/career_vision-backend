const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const errorHandler = require('./middleware/error-handler');

// Import routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const timelineRoutes = require('./routes/timelines');
const qnaRoutes = require('./routes/qna');
const recommendationRoutes = require('./routes/recommendations');
const insightsRoutes = require('./routes/insights');

const app = express();

// Debug: Confirm insightsRoutes loaded
console.log('🔍 insightsRoutes type:', typeof insightsRoutes);
console.log('🔍 insightsRoutes object:', insightsRoutes);

// Security middleware
app.use(helmet());
app.use(compression());

// Determine allowed origins based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [config.frontend.url, 'https://career-vision.netlify.app'] // Add Netlify production URL explicitly
  : ['http://localhost:4200', 'http://localhost:3000'];

// CORS configuration with dynamic origin
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin like mobile apps or curl
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: Origin not allowed'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CareerVision API is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Log available routes
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/timelines', timelineRoutes);
app.use('/api/qna', qnaRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/insights', insightsRoutes);

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
