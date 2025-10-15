const axios = require('axios');
const config = require('../config');

class UdemyService {
  constructor() {
    this.baseURL = 'https://www.udemy.com/api-2.0';
    this.clientId = config.udemy.clientId; // Your Udemy client ID
    this.clientSecret = config.udemy.clientSecret; // Your Udemy client secret
    this.authToken = null;
  }

  // Set authorization token externally or implement OAuth flow to get token
  setAuthToken(token) {
    this.authToken = token;
  }

  // Search courses on Udemy using skills from the user profile
  async searchCourses(userProfile) {
    if (!this.authToken) {
      throw new Error('Udemy auth token is not set.');
    }

    try {
      const params = {
        page_size: 20,
        search: userProfile.skills?.join(' ') || '',
        ordering: '-rating', // Sort by rating desc, change as needed
      };

      const headers = {
        Authorization: `Bearer ${this.authToken}`,
        Accept: 'application/json',
      };

      const response = await axios.get(`${this.baseURL}/courses/`, { params, headers });

      if (response.data && response.data.results) {
        return this.mapCourses(response.data.results);
      }
      return [];
    } catch (error) {
      console.error('Udemy API error:', error.response?.data || error.message);
      return [];
    }
  }

  mapCourses(apiCourses) {
    return apiCourses.map(course => ({
      id: course.id,
      source: 'udemy',
      title: course.title,
      provider: 'Udemy',
      instructor: course.visible_instructors?.map(instr => instr.display_name).join(', ') || 'N/A',
      description: course.headline || '',
      url: `https://www.udemy.com/course/${course.url_path}`,
      duration: course.content_length_text || 'N/A',
      level: course.level || 'all levels',
      price: { amount: course.price_detail.amount || 0, currency: course.price_detail.currency || 'USD', free: course.is_paid === false },
      rating: { score: course.avg_rating || 0, count: course.num_reviews || 0 },
      skills: course.tags || [],
      tags: course.categories?.map(cat => cat.title) || []
    }));
  }
}

module.exports = new UdemyService();
