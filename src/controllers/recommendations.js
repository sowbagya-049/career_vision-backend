const Recommendation = require('../models/recommendation');
const Milestone = require('../models/milestone');

// Get job recommendations
const getJobRecommendations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { refresh = false } = req.query;

    if (refresh === 'true') {
      await refreshJobRecommendations(userId);
    }

    const recommendations = await Recommendation.find({
      userId: userId,
      type: 'job',
      isActive: true
    }).sort({ matchScore: -1, createdAt: -1 }).limit(20);

    console.log(`Found ${recommendations.length} job recommendations for user ${userId}`);

    res.json({ 
      success: true, 
      data: recommendations 
    });
  } catch (error) {
    console.error('Get job recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching job recommendations',
      error: error.message 
    });
  }
};

// Get course recommendations
const getCourseRecommendations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { refresh = false } = req.query;

    if (refresh === 'true') {
      await refreshCourseRecommendations(userId);
    }

    const recommendations = await Recommendation.find({
      userId: userId,
      type: 'course',
      isActive: true
    }).sort({ matchScore: -1, createdAt: -1 }).limit(20);

    console.log(`Found ${recommendations.length} course recommendations for user ${userId}`);

    res.json({ 
      success: true, 
      data: recommendations 
    });
  } catch (error) {
    console.error('Get course recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching course recommendations',
      error: error.message 
    });
  }
};

// Refresh recommendations
const refreshRecommendations = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    await Promise.all([
      refreshJobRecommendations(userId),
      refreshCourseRecommendations(userId)
    ]);

    res.json({ 
      success: true, 
      message: 'Recommendations refreshed successfully' 
    });
  } catch (error) {
    console.error('Refresh recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error refreshing recommendations',
      error: error.message 
    });
  }
};

// Toggle save recommendation
const toggleSaveRecommendation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const recommendation = await Recommendation.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!recommendation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recommendation not found' 
      });
    }

    recommendation.isSaved = !recommendation.isSaved;
    await recommendation.save();

    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Toggle save error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error toggling save',
      error: error.message 
    });
  }
};

// Mark as applied
const markAsApplied = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const recommendation = await Recommendation.findOne({
      _id: req.params.id,
      userId: userId
    });

    if (!recommendation) {
      return res.status(404).json({ 
        success: false, 
        message: 'Recommendation not found' 
      });
    }

    recommendation.isApplied = true;
    recommendation.appliedAt = new Date();
    await recommendation.save();

    res.json({ success: true, data: recommendation });
  } catch (error) {
    console.error('Mark as applied error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error marking as applied',
      error: error.message 
    });
  }
};

// Get stats
const getRecommendationStats = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    
    const stats = await Recommendation.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: "$type",
          total: { $sum: 1 },
          saved: { $sum: { $cond: ["$isSaved", 1, 0] } },
          applied: { $sum: { $cond: ["$isApplied", 1, 0] } }
        }
      }
    ]);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching stats',
      error: error.message 
    });
  }
};

// ========== HELPER FUNCTIONS ==========

const refreshJobRecommendations = async (userId) => {
  try {
    console.log(`Refreshing job recommendations for user ${userId}`);

    // Get user's milestones
    const milestones = await Milestone.find({ user: userId }).sort({ startDate: -1 });
    
    // Extract skills from milestones
    const userSkills = new Set();
    const experiences = [];
    
    milestones.forEach(m => {
      if (m.skills) m.skills.forEach(s => userSkills.add(s.toLowerCase()));
      if (m.technologies) m.technologies.forEach(t => userSkills.add(t.toLowerCase()));
      if (m.type === 'job') experiences.push(m);
    });

    const skills = Array.from(userSkills);
    console.log(`User skills:`, skills);

    // Deactivate old recommendations
    await Recommendation.updateMany(
      { userId, type: 'job' }, 
      { isActive: false }
    );

    // Generate mock job recommendations based on skills
    const mockJobs = generateMockJobRecommendations(skills, experiences);

    // Save new recommendations
    for (const job of mockJobs) {
      const recommendation = new Recommendation({
        ...job,
        userId,
        type: 'job',
        isActive: true,
        postedDate: new Date()
      });
      await recommendation.save();
    }

    console.log(`Created ${mockJobs.length} job recommendations`);
    return mockJobs;
  } catch (error) {
    console.error('Refresh job recommendations error:', error);
    throw error;
  }
};

const refreshCourseRecommendations = async (userId) => {
  try {
    console.log(`Refreshing course recommendations for user ${userId}`);

    // Get user's milestones
    const milestones = await Milestone.find({ user: userId });
    
    // Extract skills
    const userSkills = new Set();
    milestones.forEach(m => {
      if (m.skills) m.skills.forEach(s => userSkills.add(s.toLowerCase()));
      if (m.technologies) m.technologies.forEach(t => userSkills.add(t.toLowerCase()));
    });

    const skills = Array.from(userSkills);
    console.log(`User skills for courses:`, skills);

    // Deactivate old recommendations
    await Recommendation.updateMany(
      { userId, type: 'course' }, 
      { isActive: false }
    );

    // Generate mock course recommendations
    const mockCourses = generateMockCourseRecommendations(skills);

    // Save new recommendations
    for (const course of mockCourses) {
      const recommendation = new Recommendation({
        ...course,
        userId,
        type: 'course',
        isActive: true,
        postedDate: new Date()
      });
      await recommendation.save();
    }

    console.log(`Created ${mockCourses.length} course recommendations`);
    return mockCourses;
  } catch (error) {
    console.error('Refresh course recommendations error:', error);
    throw error;
  }
};

// Generate mock job recommendations
const generateMockJobRecommendations = (userSkills, experiences) => {
  const jobTemplates = [
    {
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      description: 'Join our team to build scalable applications using modern technologies.',
      salary: '$120,000 - $180,000',
      requirements: ['5+ years experience', 'Strong coding skills', 'Team player'],
      skills: ['javascript', 'python', 'react', 'node'],
      source: 'linkedin',
      url: 'https://linkedin.com/jobs/example-1'
    },
    {
      title: 'Full Stack Developer',
      company: 'StartupXYZ',
      location: 'Remote',
      description: 'Build end-to-end features for our growing SaaS platform.',
      salary: '$90,000 - $130,000',
      requirements: ['3+ years experience', 'Full stack development', 'Agile experience'],
      skills: ['javascript', 'react', 'node', 'mongodb'],
      source: 'indeed',
      url: 'https://indeed.com/jobs/example-2'
    },
    {
      title: 'Data Scientist',
      company: 'AI Innovations',
      location: 'New York, NY',
      description: 'Analyze large datasets and build predictive models.',
      salary: '$110,000 - $160,000',
      requirements: ['Machine learning', 'Python', 'Statistics'],
      skills: ['python', 'machine learning', 'data science', 'sql'],
      source: 'linkedin',
      url: 'https://linkedin.com/jobs/example-3'
    },
    {
      title: 'Frontend Developer',
      company: 'Design Studio',
      location: 'Austin, TX',
      description: 'Create beautiful, responsive user interfaces.',
      salary: '$80,000 - $120,000',
      requirements: ['React expertise', 'CSS mastery', 'UX mindset'],
      skills: ['react', 'javascript', 'css', 'html'],
      source: 'unstop',
      url: 'https://unstop.com/jobs/example-4'
    },
    {
      title: 'Backend Engineer',
      company: 'Cloud Systems Inc',
      location: 'Seattle, WA',
      description: 'Design and implement scalable backend services.',
      salary: '$100,000 - $150,000',
      requirements: ['API design', 'Database optimization', 'Cloud platforms'],
      skills: ['node', 'python', 'aws', 'mongodb'],
      source: 'linkedin',
      url: 'https://linkedin.com/jobs/example-5'
    }
  ];

  // Calculate match scores and filter
  const recommendations = jobTemplates.map(job => {
    const matchScore = calculateMatchScore(userSkills, job.skills);
    return {
      ...job,
      matchScore
    };
  }).filter(job => job.matchScore > 30).sort((a, b) => b.matchScore - a.matchScore);

  return recommendations.slice(0, 10);
};

// Generate mock course recommendations
const generateMockCourseRecommendations = (userSkills) => {
  const courseTemplates = [
    {
      title: 'Advanced React Development',
      provider: 'Coursera',
      instructor: 'Meta Team',
      description: 'Master advanced React patterns and performance optimization.',
      duration: '6 weeks',
      level: 'advanced',
      price: '$49',
      rating: 4.8,
      skills: ['react', 'javascript'],
      source: 'coursera',
      url: 'https://coursera.org/learn/advanced-react'
    },
    {
      title: 'Machine Learning A-Z',
      provider: 'Udemy',
      instructor: 'Data Science Team',
      description: 'Complete machine learning course from basics to advanced.',
      duration: '40 hours',
      level: 'beginner',
      price: '$79',
      rating: 4.6,
      skills: ['python', 'machine learning', 'data science'],
      source: 'udemy',
      url: 'https://udemy.com/course/machine-learning'
    },
    {
      title: 'Full Stack Web Development',
      provider: 'edX',
      instructor: 'MIT',
      description: 'Build complete web applications from frontend to backend.',
      duration: '12 weeks',
      level: 'intermediate',
      price: 'Free',
      rating: 4.7,
      skills: ['javascript', 'node', 'react', 'mongodb'],
      source: 'edx',
      url: 'https://edx.org/course/full-stack'
    },
    {
      title: 'AWS Cloud Practitioner',
      provider: 'Coursera',
      instructor: 'AWS',
      description: 'Learn cloud computing fundamentals with AWS.',
      duration: '8 weeks',
      level: 'beginner',
      price: '$39',
      rating: 4.5,
      skills: ['aws', 'cloud computing'],
      source: 'coursera',
      url: 'https://coursera.org/learn/aws-cloud'
    },
    {
      title: 'Python for Data Science',
      provider: 'Udemy',
      instructor: 'Jose Portilla',
      description: 'Learn Python programming for data analysis and visualization.',
      duration: '25 hours',
      level: 'beginner',
      price: '$59',
      rating: 4.9,
      skills: ['python', 'data science'],
      source: 'udemy',
      url: 'https://udemy.com/course/python-data-science'
    }
  ];

  // Calculate match scores - recommend courses for skill gaps
  const recommendations = courseTemplates.map(course => {
    const matchScore = calculateCourseMatchScore(userSkills, course.skills);
    return {
      ...course,
      matchScore
    };
  }).filter(course => course.matchScore > 20).sort((a, b) => b.matchScore - a.matchScore);

  return recommendations.slice(0, 10);
};

// Calculate match score between user skills and job/course skills
const calculateMatchScore = (userSkills, requiredSkills) => {
  if (!userSkills || userSkills.length === 0) return 50;
  
  const matches = requiredSkills.filter(skill => 
    userSkills.some(userSkill => 
      userSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(userSkill.toLowerCase())
    )
  );

  const baseScore = (matches.length / requiredSkills.length) * 100;
  const randomVariation = Math.random() * 10 - 5; // ±5%
  
  return Math.min(95, Math.max(30, Math.round(baseScore + randomVariation)));
};

// Calculate course match score (prefer courses that teach new skills)
const calculateCourseMatchScore = (userSkills, courseSkills) => {
  const newSkills = courseSkills.filter(skill =>
    !userSkills.some(userSkill =>
      userSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );

  const relatedSkills = courseSkills.filter(skill =>
    userSkills.some(userSkill =>
      userSkill.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(userSkill.toLowerCase())
    )
  );

  // Higher score if course teaches new but related skills
  const newSkillScore = (newSkills.length / courseSkills.length) * 60;
  const relatedSkillScore = (relatedSkills.length / courseSkills.length) * 40;
  
  return Math.round(newSkillScore + relatedSkillScore);
};

module.exports = {
  getJobRecommendations,
  getCourseRecommendations,
  refreshRecommendations,
  toggleSaveRecommendation,
  markAsApplied,
  getRecommendationStats
};