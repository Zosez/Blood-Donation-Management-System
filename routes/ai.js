const express = require('express');
const router = express.Router();

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

router.post('/chat', async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const systemPrompt = `You are LifeLink AI Chat, the official assistant for LifeLink, a blood donation platform. Answer only questions about blood donation and LifeLink. Our platform connects donors and recipients in under 5 minutes, supports all blood types, and has a simple 3-step process: Register, Get matched, Save a life. If a user asks about something unrelated, politely say you can only assist with blood donation and LifeLink. Keep answers concise (2-4 sentences), friendly, and medically accurate. Do not use any emojis in your responses.`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${message}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error ${response.status}`);
    }

    const data = await response.json();
    res.json({ reply: data.candidates[0].content.parts[0].text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
