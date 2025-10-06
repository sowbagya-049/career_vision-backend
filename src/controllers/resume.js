const Resume = require('../models/resume');
const Milestone = require('../models/milestone');
const textProcessor = require('../services/text-processor');
const fs = require('fs').promises;

const aiParseResume = async (req, res) => {
  try {
    const resumeText = req.body.text;
    
    if (!resumeText || resumeText.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No resume text provided for AI parsing.' 
      });
    }

    const parsed = await textProcessor.parseResumeText(resumeText);
    
    res.json({ 
      success: true, 
      parsed: parsed 
    });
  } catch (err) {
    console.error('AI parsing error:', err);
    res.status(500).json({ 
      success: false, 
      error: "AI processing failed",
      message: err.message 
    });
  }
};

const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file.'
      });
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      try { 
        await fs.unlink(req.file.path); 
      } catch (unlinkError) { 
        console.error('Error deleting invalid file:', unlinkError);
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Please upload PDF, DOC, or DOCX files only.'
      });
    }

    const resume = await Resume.create({
      user: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      processingStatus: 'processing'
    });

    processResumeAsync(resume._id);

    res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeId: resume._id,
        filename: resume.originalName,
        size: resume.fileSize,
        status: 'processing'
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    if (req.file && req.file.path) {
      try { 
        await fs.unlink(req.file.path); 
      } catch (unlinkError) {
        console.error('Error deleting file after error:', unlinkError);
      }
    }
    next(error);
  }
};

const processResumeAsync = async (resumeId) => {
  try {
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      console.error('Resume not found:', resumeId);
      return;
    }

    let extractedText = '';
    let extractedData = {};
    
    try {
      extractedText = await textProcessor.extractTextFromFile(resume.filePath, resume.mimeType);
      extractedData = await textProcessor.parseResumeText(extractedText);
    } catch (processingError) {
      console.error('Text processing error:', processingError);
      extractedText = 'Error extracting text';
      extractedData = { error: processingError.message };
    }

    await Resume.findByIdAndUpdate(resumeId, {
      extractedText,
      extractedData,
      processingStatus: 'completed'
    });

    let totalCreated = 0;
    let totalSkipped = 0;

    // Create JOB milestones
    if (extractedData.experience && extractedData.experience.length > 0) {
      for (const exp of extractedData.experience) {
        try {
          await Milestone.create({
            user: resume.user,
            type: 'job',
            title: exp.title || 'Position',
            description: exp.description || '',
            company: exp.company || 'Company',
            startDate: exp.startDate || new Date(2023, 0, 1),
            endDate: exp.endDate || null,
            duration: exp.duration || '',
            skills: exp.skills || [],
            technologies: exp.technologies || [],
            extractedFrom: { resumeId: resume._id },
            isManuallyAdded: false
          });
          totalCreated++;
        } catch (err) {
          console.error('Failed to create job milestone:', err.message);
          totalSkipped++;
        }
      }
    }

    // Create EDUCATION milestones
    if (extractedData.education && extractedData.education.length > 0) {
      for (const edu of extractedData.education) {
        try {
          await Milestone.create({
            user: resume.user,
            type: 'education',
            title: edu.degree || 'Education',
            description: `${edu.degree} from ${edu.institution}`,
            company: edu.institution || 'Institution',
            startDate: edu.startDate || new Date(2023, 0, 1),
            endDate: null,
            skills: [],
            technologies: [],
            extractedFrom: { resumeId: resume._id },
            isManuallyAdded: false
          });
          totalCreated++;
        } catch (err) {
          console.error('Failed to create education milestone:', err.message);
          totalSkipped++;
        }
      }
    }

    // Create CERTIFICATION milestones
    if (extractedData.certifications && extractedData.certifications.length > 0) {
      for (const cert of extractedData.certifications) {
        try {
          await Milestone.create({
            user: resume.user,
            type: 'certification',
            title: cert.title || 'Certification',
            description: cert.description || '',
            company: cert.issuer || 'Certification Provider',
            startDate: cert.startDate || new Date(2023, 0, 1),
            endDate: null,
            skills: [],
            technologies: [],
            extractedFrom: { resumeId: resume._id },
            isManuallyAdded: false
          });
          totalCreated++;
        } catch (err) {
          console.error('Failed to create certification milestone:', err.message);
          totalSkipped++;
        }
      }
    }

    // Create PROJECT milestones
    if (extractedData.projects && extractedData.projects.length > 0) {
      for (const project of extractedData.projects) {
        try {
          await Milestone.create({
            user: resume.user,
            type: 'project',
            title: project.title || 'Project',
            description: project.description || '',
            company: 'Personal/Academic Project',
            startDate: project.startDate || new Date(2024, 0, 1),
            endDate: null,
            skills: [],
            technologies: project.technologies || [],
            extractedFrom: { resumeId: resume._id },
            isManuallyAdded: false
          });
          totalCreated++;
        } catch (err) {
          console.error('Failed to create project milestone:', err.message);
          totalSkipped++;
        }
      }
    }

    // Create ACHIEVEMENT milestones
    if (extractedData.achievements && extractedData.achievements.length > 0) {
      for (const achievement of extractedData.achievements) {
        try {
          await Milestone.create({
            user: resume.user,
            type: 'achievement',
            title: achievement.title || 'Achievement',
            description: achievement.description || '',
            company: 'Personal Achievement',
            startDate: achievement.startDate || new Date(2023, 0, 1),
            endDate: null,
            skills: [],
            technologies: [],
            extractedFrom: { resumeId: resume._id },
            isManuallyAdded: false
          });
          totalCreated++;
        } catch (err) {
          console.error('Failed to create achievement milestone:', err.message);
          totalSkipped++;
        }
      }
    }

    console.log(`Milestones created: ${totalCreated}, Skipped: ${totalSkipped}`);
    
  } catch (error) {
    console.error('Resume processing failed:', error);
    try {
      await Resume.findByIdAndUpdate(resumeId, {
        processingStatus: 'failed',
        processingError: error.message
      });
    } catch (updateError) {
      console.error('Error updating resume status:', updateError);
    }
  }
};

const getResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user.id })
      .sort({ createdAt: -1 });
      
    res.json({
      success: true,
      data: resumes
    });
  } catch (error) {
    next(error);
  }
};

const getResumeDetails = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }
    
    res.json({
      success: true,
      data: resume
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadResume,
  getResumes,
  getResumeDetails,
  aiParseResume
};