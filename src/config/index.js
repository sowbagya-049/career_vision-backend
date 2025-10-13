require('dotenv').config();
const path = require('path');

const config = {
  port: process.env.PORT || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/careervision',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:4200',
  },
  vertexAI: {
    projectId: process.env.VERTEX_AI_PROJECT_ID || 'career-vision-474312',
    location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    model: process.env.VERTEX_AI_MODEL || 'text-bison',
    // Resolve path relative to this config file (which is backend/src/config/index.js)
    serviceAccountPath: path.resolve(__dirname, process.env.VERTEX_AI_SERVICE_ACCOUNT_PATH || 'service-account.json'),
    apiKey: process.env.VERTEX_AI_API_KEY || '',
  },
  apis: {
    linkedin: {
      apiKey: process.env.LINKEDIN_CLIENT_ID,
      apiSecret: process.env.LINKEDIN_CLIENT_SECRET,
    },
    indeed: {
      apiKey: process.env.INDEED_API_KEY,
    },
    coursera: {
      apiKey: process.env.COURSERA_API_KEY,
    },
  },
  gemini: {
  apiKey: process.env.GEMINI_API_KEY || '',
  },

  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
};

module.exports = config;
