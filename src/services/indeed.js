const axios = require('axios');
const config = require('../config');

class IndeedService {
  constructor() {
    this.baseURL = 'https://api.indeed.com/ads';
    this.apiKey = config.indeed.apiKey; // Load your Indeed API key from config
  }

  // Real-time job search using Indeed API
  async searchJobs(userProfile) {
    try {
      // Construct query params based on user profile
      const params = {
        q: userProfile.skills?.join(' ') || 'developer',
        limit: 20,
        // Add other parameters like location, job_type etc. based on API specs
        api_key: this.apiKey, // Or use Authorization header if Indeed requires
      };

      const response = await axios.get(`${this.baseURL}/jobs`, { params });

      if (response.data && response.data.results) {
        return this.mapJobs(response.data.results);
      }
      return [];
    } catch (error) {
      console.error('Indeed API error:', error.message || error);
      // No fallback; failure returns empty array
      return [];
    }
  }

  // Map Indeed API job data to internal job structure
  mapJobs(apiJobs) {
    return apiJobs.map(job => ({
      id: job.jobkey || job.id,
      source: 'indeed',
      title: job.jobtitle || 'No title',
      company: job.company || 'Unknown',
      location: job.formattedLocation || 'Unknown',
      description: job.snippet || '',
      url: job.url || '',
      salary: {
        min: job.salaryMin || 0,
        max: job.salaryMax || 0,
        currency: job.salaryCurrency || 'USD',
      },
      jobType: job.jobtype || 'full-time',
      requirements: job.requirements || [],
      skills: job.skills || [],
      tags: job.tags || [],
    }));
  }
}

module.exports = new IndeedService();
