const Question = require('../models/question');
const Milestone = require('../models/milestone');
const { validationResult } = require('express-validator');
const { askGemini } = require('../services/gemini-ai');

// Summarize user's skills for prompt context
const summarizeSkills = (milestones) => {
  const skillsSet = new Set();
  milestones.forEach(m => {
    if (m.skills && Array.isArray(m.skills)) {
      m.skills.forEach(s => skillsSet.add(s));
    }
    if (m.technologies && Array.isArray(m.technologies)) {
      m.technologies.forEach(t => skillsSet.add(t));
    }
  });
  return Array.from(skillsSet).join(', ') || 'No skills listed';
};

// Build timeline summary for context
const buildTimelineSummary = (milestones) => {
  if (!milestones || milestones.length === 0) {
    return 'No career history available.';
  }
  const sortedMilestones = milestones.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const summary = sortedMilestones.map(m => {
    const startYear = new Date(m.startDate).getFullYear();
    const endYear = m.endDate ? new Date(m.endDate).getFullYear() : 'Present';
    const skills = m.skills && m.skills.length > 0 ? ` (Skills: ${m.skills.join(', ')})` : '';
    return `- ${startYear}-${endYear}: ${m.title} at ${m.company || 'N/A'}${skills}`;
  }).join('\n');
  return summary;
};

// Fetch recent QnA history for prompt context
const getRecentQuestions = async (userId, limit = 5) => {
  const recent = await Question.find({ user: userId }).sort({ createdAt: -1 }).limit(limit);
  return recent.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n') || 'No previous questions.';
};

const askQuestion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { question, milestoneId } = req.body;
    const userId = req.user.id;

    console.log('📝 Processing question:', question);
    console.log('👤 For user:', userId);
    console.log('📍 Milestone ID:', milestoneId);

    // Fetch user's milestones
    const milestones = await Milestone.find({ user: userId }).sort({ startDate: 1 });
    console.log('📊 Found milestones:', milestones.length);

    // Build context
    const skillsSummary = summarizeSkills(milestones);
    const timelineSummary = buildTimelineSummary(milestones);
    const recentQnA = await getRecentQuestions(userId, 3);

    // If specific milestone is provided, add its context
    let milestoneContext = '';
    if (milestoneId) {
      const milestone = milestones.find(m => m._id.toString() === milestoneId);
      if (milestone) {
        milestoneContext = `\n\nCurrent Milestone Context:\n- Title: ${milestone.title}\n- Type: ${milestone.type}\n- Company: ${milestone.company || 'N/A'}\n- Description: ${milestone.description || 'N/A'}\n- Skills: ${milestone.skills ? milestone.skills.join(', ') : 'N/A'}`;
      }
    }

    // Construct prompt for Gemini AI
    const prompt = `You are CareerVision AI, a helpful career advisor assistant.

USER'S CAREER TIMELINE:
${timelineSummary}

USER'S SKILLS: ${skillsSummary}
${milestoneContext}

RECENT CONVERSATION HISTORY:
${recentQnA}

Based on the user's career timeline and context above, provide a detailed, personalized, and actionable answer to the following question. Be specific and reference their actual experience when relevant.

USER'S QUESTION: ${question}

YOUR ANSWER:`;

    console.log('📤 Calling Gemini AI with prompt length:', prompt.length);

    // Call Gemini AI
    const answer = await askGemini(prompt);

    console.log('💬 Generated answer length:', answer.length);

    // Save question-answer in database
    const questionDoc = await Question.create({
      user: userId,
      question,
      answer,
      category: 'general',
      confidence: 85,
      context: {
        skillsSummary,
        timelineSummary,
        milestoneId: milestoneId || null,
        milestonesCount: milestones.length,
      },
    });

    console.log('💾 Question saved to database:', questionDoc._id);

    res.json({
      success: true,
      data: {
        answer,
        confidence: 85,
        category: 'general',
        questionId: questionDoc._id,
      },
    });
  } catch (error) {
    console.error('❌ Ask question error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to process your question. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const getQuestionHistory = async (req, res, next) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const questions = await Question.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Question.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      data: {
        items: questions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const rateAnswer = async (req, res, next) => {
  try {
    const { helpful } = req.body;

    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { helpful: helpful === true },
      { new: true },
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    res.json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  askQuestion,
  getQuestionHistory,
  rateAnswer,
};
