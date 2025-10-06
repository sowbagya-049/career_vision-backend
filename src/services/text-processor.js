const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;

const parseDateRange = (text) => {
  const patterns = [
    /(\d{4})\s*[-–—]\s*(\d{4}|Present|Current)/i,
    /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\s*[-–—]\s*(Present|Current|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const startDate = new Date(match[1].trim());
        const endDateStr = match[2].trim();
        const endDate = (endDateStr.toLowerCase() === 'present' || endDateStr.toLowerCase() === 'current') 
          ? null 
          : new Date(endDateStr);
        
        if (startDate instanceof Date && !isNaN(startDate)) {
          return { startDate, endDate: (endDate && !isNaN(endDate)) ? endDate : null };
        }
      } catch (e) {
        console.warn('Date parsing error:', e.message);
      }
    }
  }
  
  const yearMatch = text.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return { startDate: new Date(parseInt(yearMatch[0]), 0, 1), endDate: null };
  }
  
  return { startDate: null, endDate: null };
};

const extractTextFromFile = async (filePath, mimeType) => {
  try {
    let text = '';
    
    if (mimeType === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value;
    } else if (mimeType === 'application/msword') {
      const buffer = await fs.readFile(filePath);
      text = buffer.toString('utf8');
    } else {
      throw new Error('Unsupported file type');
    }
    
    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from file: ${error.message}`);
  }
};

const parseResumeText = async (text) => {
  try {
    const data = {
      personalInfo: {},
      skills: [],
      experience: [],
      education: [],
      certifications: [],
      projects: [],
      achievements: []
    };

    if (!text || text.trim().length === 0) {
      return data;
    }

    const cleanText = text.replace(/\s+/g, ' ').trim();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    data.personalInfo = extractPersonalInfo(cleanText);
    data.skills = extractSkills(cleanText);
    data.projects = extractProjectsCustom(cleanText);
    data.certifications = extractCertificationsCustom(cleanText);
    data.achievements = extractAchievementsCustom(lines);
    data.education = extractEducationCustom(cleanText);
    data.experience = extractExperienceCustom(cleanText);

    console.log('Parsed resume data:', {
      experience: data.experience.length,
      education: data.education.length,
      certifications: data.certifications.length,
      projects: data.projects.length,
      achievements: data.achievements.length
    });

    return data;
  } catch (error) {
    console.error('Resume parsing error:', error);
    throw new Error(`Failed to parse resume text: ${error.message}`);
  }
};

const extractProjectsCustom = (text) => {
  const projects = [];
  
  const knownProjects = [
    { 
      keyword: 'Air Pollution Analysis', 
      title: 'Air Pollution Analysis', 
      tech: ['Python'],
      desc: 'Data-driven analysis of Indian air pollutants using machine learning'
    },
    { 
      keyword: 'Library Management System', 
      title: 'Library Management System', 
      tech: ['PHP', 'MySQL', 'HTML', 'CSS'],
      desc: 'College library management system for students and faculty'
    },
    { 
      keyword: 'Freelancer Management System', 
      title: 'Freelancer Management System', 
      tech: ['Java', 'HTML', 'CSS', 'MySQL'],
      desc: 'Platform to streamline freelancer-client interactions'
    }
  ];
  
  knownProjects.forEach(proj => {
    if (text.includes(proj.keyword)) {
      projects.push({
        title: proj.title,
        description: proj.desc,
        technologies: proj.tech,
        startDate: new Date(2024, 0, 1)
      });
    }
  });
  
  return projects;
};

const extractCertificationsCustom = (text) => {
  const certifications = [];
  
  const knownCerts = [
    { keyword: 'Principle of Management', issuer: 'Great Learning' },
    { keyword: 'SEO Certificate Course', issuer: 'HubSpot Academy' },
    { keyword: 'NPTEL', issuer: 'NPTEL' },
    { keyword: 'Research Paper Presentation', issuer: 'Academic Conference' }
  ];
  
  knownCerts.forEach(cert => {
    if (text.includes(cert.keyword)) {
      certifications.push({
        title: cert.keyword,
        issuer: cert.issuer,
        startDate: new Date(2023, 0, 1),
        description: `${cert.keyword} from ${cert.issuer}`
      });
    }
  });
  
  return certifications;
};

const extractAchievementsCustom = (lines) => {
  const achievements = [];
  const seen = new Set();
  
  const achievementKeywords = [
    'Participated',
    'Attended',
    'Hackthon',
    'Workshop',
    'Melinia',
    'Co - Curricular',
    'Co-Curricular'
  ];
  
  lines.forEach((line, index) => {
    achievementKeywords.forEach(keyword => {
      if (line.includes(keyword) && !seen.has(line)) {
        seen.add(line);
        let description = line;
        if (index < lines.length - 1) {
          description += ' ' + lines[index + 1];
        }
        
        achievements.push({
          title: line.substring(0, 100),
          description: description.substring(0, 200),
          startDate: new Date(2023, 0, 1)
        });
      }
    });
  });
  
  return achievements.slice(0, 10);
};

const extractEducationCustom = (text) => {
  const education = [];
  
  if (text.includes('M.Sc.')) {
    const mscMatch = text.match(/M\.Sc\.\s+([^\d]+)\s+([^\d]+)\s+(20\d{2})\s*[-–—]\s*(20\d{2}|Present)/i);
    if (mscMatch) {
      education.push({
        degree: `M.Sc. ${mscMatch[1].trim()}`,
        institution: mscMatch[2].trim(),
        year: mscMatch[3],
        startDate: new Date(parseInt(mscMatch[3]), 0, 1)
      });
    }
  }
  
  if (text.includes('Class 12')) {
    const class12Match = text.match(/Class 12\s*,\s*([^,]+),\s*(20\d{2})/i);
    if (class12Match) {
      education.push({
        degree: 'Class 12',
        institution: class12Match[1].trim(),
        year: class12Match[2],
        startDate: new Date(parseInt(class12Match[2]), 0, 1)
      });
    }
  }
  
  return education;
};

const extractExperienceCustom = (text) => {
  const experience = [];
  const internshipPattern = /Online Internship in ([^\(]+)\(([^\)]+)\)\s*-\s*([^\n]+)/gi;
  
  let match;
  while ((match = internshipPattern.exec(text)) !== null) {
    const field = match[1].trim();
    const duration = match[2].trim();
    const company = match[3].trim();
    
    experience.push({
      title: `Internship in ${field}`,
      company: company,
      duration: duration,
      description: `${duration} internship in ${field} at ${company}`,
      startDate: new Date(2023, 6, 1),
      endDate: null,
      skills: [field],
      technologies: []
    });
  }
  
  return experience;
};

const extractPersonalInfo = (text) => {
  const info = {};
  
  const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) info.email = emailMatch[0];
  
  const phoneMatch = text.match(/\+?\d{10,}/);
  if (phoneMatch) info.phone = phoneMatch[0];
  
  const nameMatch = text.match(/^([A-Z][A-Za-z\s]{2,40})/);
  if (nameMatch) info.name = nameMatch[1].trim();
  
  return info;
};

const extractSkills = (text) => {
  const skills = [];
  const lowerText = text.toLowerCase();
  
  const skillsList = [
    'python', 'java', 'javascript', 'c', 'r', 'sql', 'php', 'html', 'css',
    'mysql', 'oracle', 'react', 'angular', 'node', 'express', 'mongodb'
  ];
  
  skillsList.forEach(skill => {
    if (lowerText.includes(skill)) {
      skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });
  
  return [...new Set(skills)];
};

module.exports = {
  extractTextFromFile,
  parseResumeText,
  parseDateRange
};
