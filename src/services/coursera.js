const axios = require('axios');
const config = require('../config'); // Ensure your config file exports coursera.apiKey

class CourseraService {
  constructor() {
    this.baseURL = 'https://api.coursera.org/api';
    this.apiKey = config.coursera.apiKey;
  }

  // Fetch latest live courses from Coursera API
  async searchCourses(userProfile) {
    try {
      // Example Courses API endpoint (uses v1 public catalog)
      const response = await axios.get(`${this.baseURL}/courses.v1`, {
        params: {
          q: 'search',
          query: userProfile.query || userProfile.skills?.join(' ') || 'software',
          limit: 20,
          includes: 'partnerIds,instructorIds'
        },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      const courses = this.mapCourses(response.data.elements);
      return courses;
    } catch (error) {
      console.error('Coursera API error:', error.message);
      throw new Error('Failed to fetch live Coursera courses');
    }
  }

  // Standardize live API data to your internal schema
  mapCourses(apiCourses) {
    return apiCourses.map(course => ({
      id: course.id,
      source: 'coursera',
      title: course.name || 'Untitled Course',
      provider: 'Coursera',
      instructor: course.instructorIds ? `${course.instructorIds.length} instructor(s)` : 'N/A',
      description: course.description || 'No description available',
      url: `https://www.coursera.org/learn/${course.slug || course.id}`,
      duration: course.estimatedWorkload || 'N/A',
      level: course.difficulty || 'All levels',
      price: { amount: 0, currency: 'USD', free: true }, // Most Coursera data does not expose price directly
      rating: { score: 0, count: 0 }, // Not in basic API payload
      skills: course.domains?.map(d => d.name) || [],
      tags: course.courseType ? [course.courseType] : []
    }));
  }
}

module.exports = new CourseraService();
