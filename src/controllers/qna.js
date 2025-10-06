const Question = require('../models/question');
const Milestone = require('../models/milestone');
const Recommendation = require('../models/recommendation');
const { NlpManager } = require('node-nlp');
const { validationResult } = require('express-validator');

const nlpManager = new NlpManager({ languages: ['en'] });

const trainNLPModel = () => {
  // Career gaps
  nlpManager.addDocument('en', 'Do I have career gaps', 'career.gaps');
  nlpManager.addDocument('en', 'Are there any gaps in my career', 'career.gaps');
  nlpManager.addDocument('en', 'Show me my employment breaks', 'career.gaps');
  nlpManager.addDocument('en', 'gaps in my timeline', 'career.gaps');

  // Skills
  nlpManager.addDocument('en', 'What are my skills', 'career.skills');
  nlpManager.addDocument('en', 'Which skills do I have', 'career.skills');
  nlpManager.addDocument('en', 'List my competencies', 'career.skills');
  nlpManager.addDocument('en', 'show my technical skills', 'career.skills');
  nlpManager.addDocument('en', 'what technologies do I know', 'career.skills');

  // Jobs
  nlpManager.addDocument('en', 'Find jobs for me', 'career.jobs');
  nlpManager.addDocument('en', 'Which jobs match my profile', 'career.jobs');
  nlpManager.addDocument('en', 'Show me job opportunities', 'career.jobs');
  nlpManager.addDocument('en', 'recommend jobs', 'career.jobs');
  nlpManager.addDocument('en', 'job suggestions', 'career.jobs');

  // Courses
  nlpManager.addDocument('en', 'Recommend courses', 'career.courses');
  nlpManager.addDocument('en', 'What courses should I take', 'career.courses');
  nlpManager.addDocument('en', 'Suggest training programs', 'career.courses');
  nlpManager.addDocument('en', 'learning recommendations', 'career.courses');
  nlpManager.addDocument('en', 'improve my skills', 'career.courses');

  // Career growth
  nlpManager.addDocument('en', 'How can I advance my career', 'career.growth');
  nlpManager.addDocument('en', 'career progression advice', 'career.growth');
  nlpManager.addDocument('en', 'next career step', 'career.growth');
  nlpManager.addDocument('en', 'career development', 'career.growth');

  nlpManager.train();
};

trainNLPModel();

const askQuestion = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { question } = req.body;
    const userId = req.user.id;
    const startTime = Date.now();

    const response = await nlpManager.process('en', question);
    
    let answer = '';
    let category = 'general';
    let confidence = response.score * 100;
    let context = {};

    switch (response.intent) {
      case 'career.gaps':
        const gapAnalysis = await analyzeCareerGaps(userId);
        answer = gapAnalysis.answer;
        category = 'career-gap';
        context = gapAnalysis.context;
        break;

      case 'career.skills':
        const skillsAnalysis = await analyzeSkills(userId);
        answer = skillsAnalysis.answer;
        category = 'skills';
        context = skillsAnalysis.context;
        break;

      case 'career.jobs':
        const jobsAnalysis = await analyzeJobMatches(userId);
        answer = jobsAnalysis.answer;
        category = 'recommendations';
        context = jobsAnalysis.context;
        break;

      case 'career.courses':
        const coursesAnalysis = await analyzeCourseRecommendations(userId);
        answer = coursesAnalysis.answer;
        category = 'recommendations';
        context = coursesAnalysis.context;
        break;

      case 'career.growth':
        const growthAnalysis = await analyzeCareerGrowth(userId);
        answer = growthAnalysis.answer;
        category = 'growth';
        context = growthAnalysis.context;
        break;

      default:
        answer = "I can help you with questions about:\n\n" +
                 "• Career gaps and timeline analysis\n" +
                 "• Your skills and experience\n" +
                 "• Job recommendations\n" +
                 "• Course suggestions\n" +
                 "• Career growth advice\n\n" +
                 "Try asking something like: 'Do I have any career gaps?' or 'What jobs match my skills?'";
        confidence = Math.max(20, confidence);
    }

    const processingTime = Date.now() - startTime;

    const questionDoc = await Question.create({
      user: userId,
      question,
      answer,
      category,
      confidence: Math.round(confidence),
      context,
      processingTime
    });

    res.json({
      success: true,
      data: {
        answer,
        confidence: Math.round(confidence),
        category,
        questionId: questionDoc._id
      }
    });
  } catch (error) {
    console.error('Ask question error:', error);
    next(error);
  }
};

const analyzeCareerGaps = async (userId) => {
  try {
    const jobMilestones = await Milestone.find({
      user: userId,
      type: 'job'
    }).sort({ startDate: 1 });

    if (jobMilestones.length === 0) {
      return {
        answer: "I don't see any job experiences in your timeline yet. Upload your resume to get a detailed career gap analysis.",
        context: { milestones: [] }
      };
    }

    const gaps = [];
    for (let i = 1; i < jobMilestones.length; i++) {
      const prevEnd = jobMilestones[i - 1].endDate;
      const currentStart = jobMilestones[i].startDate;
      
      if (prevEnd && currentStart) {
        const gapDays = Math.ceil((currentStart - prevEnd) / (1000 * 60 * 60 * 24));
        
        if (gapDays > 30) {
          gaps.push({
            duration: Math.floor(gapDays / 30),
            startDate: prevEnd,
            endDate: currentStart,
            beforeJob: jobMilestones[i - 1].title,
            afterJob: jobMilestones[i].title
          });
        }
      }
    }

    let answer = '';
    if (gaps.length === 0) {
      answer = "Good news! I don't see any significant career gaps (over 1 month) in your timeline. Your career progression appears continuous, which is great for your professional profile.";
    } else {
      answer = `I found ${gaps.length} career gap${gaps.length > 1 ? 's' : ''} in your timeline:\n\n`;
      gaps.forEach((gap, index) => {
        answer += `${index + 1}. **${gap.duration} month${gap.duration > 1 ? 's' : ''}** gap\n`;
        answer += `   Between: "${gap.beforeJob}" and "${gap.afterJob}"\n\n`;
      });
      answer += "💡 **Tips to address career gaps:**\n";
      answer += "• Highlight any freelance work, volunteering, or personal projects during these periods\n";
      answer += "• Add certifications or courses you completed\n";
      answer += "• Be prepared to explain these gaps positively in interviews";
    }

    return { answer, context: { milestones: jobMilestones.map(m => m._id), gaps: gaps.length } };
  } catch (error) {
    return {
      answer: "I encountered an error analyzing your career gaps. Please try again.",
      context: {}
    };
  }
};

const analyzeSkills = async (userId) => {
  try {
    const milestones = await Milestone.find({ user: userId });
    
    if (milestones.length === 0) {
      return {
        answer: "I don't have enough information about your skills yet. Upload your resume or add milestones to get a detailed skill analysis.",
        context: { skills: [] }
      };
    }

    const skillsMap = new Map();
    milestones.forEach(milestone => {
      if (milestone.skills) {
        milestone.skills.forEach(skill => {
          const key = skill.toLowerCase();
          skillsMap.set(key, (skillsMap.get(key) || 0) + 1);
        });
      }
      if (milestone.technologies) {
        milestone.technologies.forEach(tech => {
          const key = tech.toLowerCase();
          skillsMap.set(key, (skillsMap.get(key) || 0) + 1);
        });
      }
    });

    const sortedSkills = Array.from(skillsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    if (sortedSkills.length === 0) {
      return {
        answer: "I couldn't find specific skills listed in your milestones. Consider adding skills to your experiences for better analysis and job matching.",
        context: { skills: [] }
      };
    }

    let answer = `Based on ${milestones.length} milestone${milestones.length > 1 ? 's' : ''}, here's your skill profile:\n\n`;
    answer += "🏆 **Top Skills:**\n";
    sortedSkills.slice(0, 5).forEach((skill, index) => {
      const capitalize = skill[0].charAt(0).toUpperCase() + skill[0].slice(1);
      answer += `${index + 1}. ${capitalize} (used in ${skill[1]} milestone${skill[1] > 1 ? 's' : ''})\n`;
    });

    if (sortedSkills.length > 5) {
      answer += "\n📋 **Additional Skills:**\n";
      sortedSkills.slice(5).forEach(skill => {
        const capitalize = skill[0].charAt(0).toUpperCase() + skill[0].slice(1);
        answer += `• ${capitalize}\n`;
      });
    }

    answer += "\n💡 These skills demonstrate your technical expertise across " + new Set(milestones.map(m => m.type)).size + " different areas.";

    return {
      answer,
      context: {
        skills: sortedSkills.map(s => s[0]),
        totalMilestones: milestones.length
      }
    };
  } catch (error) {
    return {
      answer: "I encountered an error analyzing your skills. Please try again.",
      context: {}
    };
  }
};

const analyzeJobMatches = async (userId) => {
  try {
    let recommendations = await Recommendation.find({
      userId: userId,
      type: 'job',
      isActive: true
    }).sort({ matchScore: -1 }).limit(5);

    if (recommendations.length === 0) {
      // Try to generate recommendations
      const { refreshJobRecommendations } = require('./recommendations');
      await refreshJobRecommendations(userId);
      
      recommendations = await Recommendation.find({
        userId: userId,
        type: 'job',
        isActive: true
      }).sort({ matchScore: -1 }).limit(5);
    }

    if (recommendations.length === 0) {
      return {
        answer: "I don't have job recommendations yet. Make sure your profile is complete with skills and experience, then visit the Recommendations page to generate suggestions.",
        context: {}
      };
    }

    let answer = `I found ${recommendations.length} job opportunities matching your profile:\n\n`;
    
    recommendations.forEach((job, index) => {
      answer += `${index + 1}. **${job.title}** at ${job.company}\n`;
      answer += `   📍 ${job.location} | 🎯 ${job.matchScore}% match\n`;
      if (job.salary) {
        answer += `   💰 ${job.salary}\n`;
      }
      if (job.skills && job.skills.length > 0) {
        answer += `   🔧 ${job.skills.slice(0, 3).join(', ')}\n`;
      }
      answer += `\n`;
    });

    const avgMatch = Math.round(recommendations.reduce((sum, r) => sum + r.matchScore, 0) / recommendations.length);
    answer += `📊 Average match score: ${avgMatch}%\n\n`;
    answer += "Visit the Recommendations page to view full details and apply directly.";

    return {
      answer,
      context: {
        recommendations: recommendations.length,
        averageMatch: avgMatch
      }
    };
  } catch (error) {
    console.error('Job match analysis error:', error);
    return {
      answer: "I encountered an error finding job matches. Please try refreshing recommendations from the Recommendations page.",
      context: {}
    };
  }
};

const analyzeCourseRecommendations = async (userId) => {
  try {
    let recommendations = await Recommendation.find({
      userId: userId,
      type: 'course',
      isActive: true
    }).sort({ matchScore: -1 }).limit(5);

    if (recommendations.length === 0) {
      const { refreshCourseRecommendations } = require('./recommendations');
      await refreshCourseRecommendations(userId);
      
      recommendations = await Recommendation.find({
        userId: userId,
        type: 'course',
        isActive: true
      }).sort({ matchScore: -1 }).limit(5);
    }

    if (recommendations.length === 0) {
      return {
        answer: "I don't have course recommendations yet. Complete your profile and visit the Recommendations page to get personalized learning suggestions.",
        context: {}
      };
    }

    let answer = `Here are ${recommendations.length} courses to boost your career:\n\n`;
    
    recommendations.forEach((course, index) => {
      answer += `${index + 1}. **${course.title}**\n`;
      answer += `   🏫 ${course.provider}`;
      if (course.level) answer += ` | Level: ${course.level}`;
      answer += `\n`;
      if (course.duration) answer += `   ⏱️ ${course.duration}`;
      if (course.matchScore) answer += ` | Match: ${course.matchScore}%`;
      answer += `\n`;
      if (course.price) answer += `   💰 ${course.price}\n`;
      if (course.skills && course.skills.length > 0) {
        answer += `   📚 Skills: ${course.skills.slice(0, 3).join(', ')}\n`;
      }
      answer += `\n`;
    });

    answer += "These courses will help you develop new skills and advance your career. Visit the Recommendations page to enroll.";

    return {
      answer,
      context: {
        recommendations: recommendations.length,
        levels: [...new Set(recommendations.map(r => r.level).filter(Boolean))]
      }
    };
  } catch (error) {
    console.error('Course recommendation error:', error);
    return {
      answer: "I encountered an error finding courses. Please try refreshing recommendations.",
      context: {}
    };
  }
};

const analyzeCareerGrowth = async (userId) => {
  try {
    const milestones = await Milestone.find({ user: userId }).sort({ startDate: -1 });
    const jobs = milestones.filter(m => m.type === 'job');
    const education = milestones.filter(m => m.type === 'education');
    const certifications = milestones.filter(m => m.type === 'certification');
    
    let answer = "Based on your career timeline, here are growth recommendations:\n\n";
    
    if (jobs.length > 0) {
      const latestJob = jobs[0];
      answer += `📊 **Current Position:** ${latestJob.title}\n\n`;
    }
    
    answer += "🎯 **Next Steps:**\n";
    
    if (certifications.length < 2) {
      answer += "• Earn industry certifications to strengthen your credentials\n";
    }
    
    if (jobs.length > 0 && jobs.length < 3) {
      answer += "• Gain more diverse experience across different roles/companies\n";
    }
    
    answer += "• Build a strong professional network\n";
    answer += "• Consider mentorship opportunities\n";
    answer += "• Keep your skills updated with latest technologies\n\n";
    
    answer += "💡 Check the Recommendations page for specific courses and job opportunities aligned with your growth path.";
    
    return { answer, context: { jobs: jobs.length, certifications: certifications.length } };
  } catch (error) {
    return {
      answer: "I encountered an error analyzing your career growth. Please try again.",
      context: {}
    };
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
      data: questions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
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
      { new: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  askQuestion,
  getQuestionHistory,
  rateAnswer
};