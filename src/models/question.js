const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters']
  },
  answer: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['career-gap', 'skills', 'recommendations', 'growth', 'general'],
    default: 'general'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 80
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  helpful: {
    type: Boolean,
    default: null
  },
  processingTime: {
    type: Number
  }
}, {
  timestamps: true
});

questionSchema.index({ user: 1, createdAt: -1 });
questionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Question', questionSchema);