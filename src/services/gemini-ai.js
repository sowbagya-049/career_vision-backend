const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function askGemini(question) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ text: question }],
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.95,
      topK: 40,
    });

    if (response?.text) {
      return response.text;
    } else if (response?.choices?.length > 0) {
      return response.choices[0].message.content;
    } else {
      throw new Error("Empty response from Gemini API");
    }
  } catch (error) {
    console.error("Error calling Gemini AI:", error);
    throw error;
  }
}

module.exports = { askGemini };
