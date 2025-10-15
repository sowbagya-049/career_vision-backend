const axios = require('axios');
const config = require('../config');

class UnstopService {
  constructor() {
    this.baseURL = 'https://api.unstop.com';
    this.apiKey = config.unstop.apiKey; // Your Unstop API key here
  }

  async searchJobs(userProfile) {
    try {
      // Example API request params (customize according to actual Unstop API docs)
      const params = {
        skills: userProfile.skills?.join(',') || '',
        limit: 20,
        // Add other filters like location, jobType, etc. if supported
      };

      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      };

      const response = await axios.get(`${this.baseURL}/jobs`, { params, headers });

      if (response.data && response.data.jobs) {
        return this.mapJobs(response.data.jobs);
      }
      return [];
    } catch (error) {
      console.error('Unstop API error:', error.response?.data || error.message);
      return [];
    }
  }

  mapJobs(apiJobs) {
    return apiJobs.map(job => ({
      id: job.id,
      source: 'unstop',
      title: job.title,
      company: job.company_name,
      location: job.location,
      description: job.description,
      url: job.url,
      salary: job.salary
        ? {
            min: job.salary.min,
            max: job.salary.max,
            currency: job.salary.currency,
          }
        : null,
      jobType: job.job_type,
      requirements: job.requirements || [],
      skills: job.skills || [],
      tags: job.tags || [],
    }));
  }
}

module.exports = new UnstopService();
