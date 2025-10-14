const express = require('express');
const auth = require('../middleware/auth');
const {
  getCareerInsights,
  getAnalyticsData,
  generateReport
} = require('../controllers/insights');

const router = express.Router();

// Debug log to confirm routes load correctly
console.log('✅ Insights routes initialized');

// Routes
router.get('/career', auth, async (req, res, next) => {
  try {
    await getCareerInsights(req, res, next);
  } catch (error) {
    console.error('❌ Error in GET /api/insights/career:', error);
    next(error);
  }
});

router.get('/analytics', auth, async (req, res, next) => {
  try {
    await getAnalyticsData(req, res, next);
  } catch (error) {
    console.error('❌ Error in GET /api/insights/analytics:', error);
    next(error);
  }
});

router.post('/report', auth, async (req, res, next) => {
  try {
    await generateReport(req, res, next);
  } catch (error) {
    console.error('❌ Error in POST /api/insights/report:', error);
    next(error);
  }
});

module.exports = router;
