const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const {
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getTimelineAnalytics
} = require('../controllers/timeline');

const router = express.Router();

// Middleware to set cache control headers for all routes in this router
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next(); // Don't forget to call next() to pass control to the next middleware/route handler
});

// Validation middleware for milestones
const milestoneValidation = [
  body('title').trim().isLength({ min: 2, max: 200 }).withMessage('Title must be between 2-200 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10-1000 characters'),
  body('type').isIn(['education', 'job', 'certification', 'achievement', 'project']).withMessage('Invalid milestone type'),
  body('startDate').isISO8601().withMessage('Start date must be valid'),
  body('endDate').optional().isISO8601().withMessage('End date must be valid'),
  body('company').optional().trim().isLength({ max: 200 }).withMessage('Company name cannot exceed 200 characters'),
  body('location').optional().trim().isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('technologies').optional().isArray().withMessage('Technologies must be an array')
];

// Routes for timeline milestones
router.get('/milestones', auth, getMilestones);
router.post('/milestones', auth, milestoneValidation, createMilestone);
router.put('/milestones/:id', auth, milestoneValidation, updateMilestone);
router.delete('/milestones/:id', auth, deleteMilestone);

// Route for timeline analytics
router.get('/analytics', auth, getTimelineAnalytics);

module.exports = router;