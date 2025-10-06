const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: false
  },
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['education', 'job', 'certification', 'achievement', 'project'],
    default: 'job'
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    default: null
  },
  duration: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  technologies: [{
    type: String,
    trim: true
  }],
  isManuallyAdded: {
    type: Boolean,
    default: false
  },
  extractionConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  extractedFrom: {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    }
  }
}, {
  timestamps: true
});

milestoneSchema.index({ user: 1, startDate: -1 });
milestoneSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Milestone', milestoneSchema);