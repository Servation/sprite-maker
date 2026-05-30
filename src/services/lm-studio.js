/**
 * Fetches the list of active local models from the LM Studio server
 * @param {string} serverUrl - The base server URL (e.g. 'http://localhost:1234')
 * @returns {Promise<string[]>} Resolves to an array of model IDs
 */
export async function fetchLocalModels(serverUrl = 'http://localhost:1234', apiKey = '') {
  const cleanUrl = serverUrl.replace(/\/$/, '');
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const response = await fetch(`${cleanUrl}/v1/models`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`Failed to query LM Studio: ${response.statusText}`);
    }

    const data = await response.json();
    // LM Studio returns a standard OpenAI-style models list
    return data.data ? data.data.map(model => model.id) : [];
  } catch (error) {
    console.error('Error fetching local models:', error);
    throw error;
  }
}

/**
 * Sends a prompt enhancement request to LM Studio
 * @param {string} serverUrl - LM Studio Server Url
 * @param {string} model - Selected model name
 * @param {string} userPrompt - Original input prompt
 * @returns {Promise<string>} The optimized prompt string
 */
export async function enhancePrompt(serverUrl, model, userPrompt, apiKey = '') {
  if (!userPrompt || !userPrompt.trim()) {
    throw new Error('Prompt cannot be empty.');
  }

  const cleanUrl = serverUrl.replace(/\/$/, '');
  const systemPrompt = `You are a professional Prompt Engineer for AI video and image models (specifically Google Veo 3.1 and Stable Diffusion).
Your task is to take a simple game character action description and expand it into a rich, detailed generative prompt.

Follow these strict rules:
1. Describe the character details (clothing, hair, accessories) in high contrast.
2. Focus on describing a clean, loop-ready animation motion (walk cycles, idle breathing, attack animations, jump cycles).
3. Do NOT include phrases related to background color or looping, as these are appended automatically by the application (avoid terms like "green screen" or "perfect loop").
4. Output ONLY the resulting prompt. Do not write intros, explanations, or quotes. Output the prompt directly.`;

  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    const response = await fetch(`${cleanUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please optimize and expand this simple action: "${userPrompt}"` }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      throw new Error(`LM Studio completion failed: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;
    
    if (!result) {
      throw new Error('Empty response from local LLM.');
    }

    return result.trim();
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    throw error;
  }
}
