// 🤖 AI AUTOCOMPLETE API MOCK
// This would connect to OpenAI, Claude, or other AI services in production

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  // Mock AI responses based on prompt
  const responses = {
    'hello': 'Hello! How can I help you today?',
    'write': 'Here\'s a great way to start writing...',
    'explain': 'Let me explain this concept clearly...',
    'list': '1. First point\n2. Second point\n3. Third point',
    'code': '```javascript\nfunction example() {\n  return "Hello World";\n}\n```',
    'default': 'I can help you continue writing. What would you like to focus on?'
  };

  // Simple keyword matching for demo
  const lowercasePrompt = prompt.toLowerCase();
  let response = responses.default;

  for (const keyword in responses) {
    if (lowercasePrompt.includes(keyword)) {
      response = responses[keyword];
      break;
    }
  }

  // Simulate API delay
  setTimeout(() => {
    res.status(200).json({
      completion: response,
      id: Math.random().toString(36).substring(7)
    });
  }, 500);
}
