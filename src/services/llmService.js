const axios = require('axios');

async function generateLLMCompletion(prompt) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {   console.error('Error calling LLM API:', error.message);
    console.error('Error calling LLM API:', error.message);
    throw new Error('LLM service failed');
  }
}

module.exports = { generateLLMCompletion };
