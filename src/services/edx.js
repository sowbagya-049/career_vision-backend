const axios = require('axios');
const config = require('../config');

class EdXService {
  constructor() {
    this.baseURL = 'https://api.edx.org/api/courses/v1';
    this.apiKey = config.edx.apiKey; // Provide your actual edX API key here
  }

  async searchCourses(userProfile) {
    try {
      const params = {
        // You can modify query parameters as per the edX API documentation
        // For example, filter by skill keywords or category if supported
        page_size: 20,
        q: userProfile.skills?.join(' ') || '',
      };

      const headers = {
        // Use API key in header if needed, otherwise adjust authentication as per docs
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      };

      const response = await axios.get(this.baseURL, { params, headers });

      if (response.data && response.data.results) {
        return this.mapCourses(response.data.results);
      }
      return [];
    } catch (error) {
      console.error('edX API error:', error.response?.data || error.message);
      return [];
    }
  }

  mapCourses(apiCourses) {
    return apiCourses.map(course => ({
      id: course.id,
      source: 'edx',
      title: course.title,
      provider: 'edX',
      instructor: course.instructor || 'N/A',
      description: course.short_description || '',
      url: course.course_url || '',
      duration: course.expected_duration || 'N/A',
      level: course.level || 'N/A',
      price: { amount: course.price || 0, currency: 'USD', free: course.price === 0 },
      rating: { score: course.avg_rating || 0, count: course.num_ratings || 0 },
      skills: course.skills || [],
      tags: course.categories || [],
    }));
  }
}

module.exports = new EdXService();
