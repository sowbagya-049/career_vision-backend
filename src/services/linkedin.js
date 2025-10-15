const axios = require('axios');
const config = require('../config');

class LinkedInService {
  constructor() {
    this.baseURL = 'https://api.linkedin.com/v2';
    this.accessToken = null;
  }

  // Set the OAuth Access Token externally or implement token retrieval logic here
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Real-time job search using LinkedIn API
  async searchJobs(userProfile) {
    try {
      if (!this.accessToken) {
        throw new Error('LinkedIn access token is not set');
      }

      // Example: Search jobs endpoint, adjust query params as per LinkedIn API docs
      const params = {
        keywords: userProfile.skills?.join(' ') || 'software engineer',
        count: 20,
        start: 0
      };

      const response = await axios.get(`${this.baseURL}/jobs`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        },
        params
      });

      // Map LinkedIn API response to internal structure
      return this.mapJobs(response.data.elements || []);
    } catch (error) {
      console.error('LinkedIn API error:', error.response?.data || error.message || error);
      // Return empty array on failure
      return [];
    }
  }

  mapJobs(apiJobs) {
    return apiJobs.map(job => ({
      id: job.id,
      source: 'linkedin',
      title: job.title || 'No title',
      company: job.companyName || 'Unknown',
      location: job.locationDescription || 'Unknown',
      description: job.descriptionSnippet || '',
      url: `https://www.linkedin.com/jobs/view/${job.jobPostingUrlSuffix || job.id}`,
      salary: job.salary || null,
      jobType: job.jobType || 'full-time',
      requirements: job.requirements || [],
      skills: job.skills || [],
      tags: job.tags || []
    }));
  }
}

module.exports = new LinkedInService();
