import { GoogleGenAI } from '@google/genai';

/**
 * Submits a video generation request to the Google Gen AI API
 * @param {string} apiKey - User's Gemini API Key
 * @param {object} params - Request parameters
 * @param {string} params.prompt - Text prompt
 * @param {string} params.model - Model name (e.g. veo-2.0-generate-001)
 * @param {string} [params.referenceImage] - Base64 encoded reference image (optional)
 * @returns {Promise<object>} The active operation object
 */
export async function submitGeneration(apiKey, { prompt, model = 'veo-2.0-generate-001', referenceImage }) {
  if (!apiKey) {
    throw new Error('API Key is required to generate video.');
  }

  // Optimize prompt for sprite loop + green screen background
  const optimizedPrompt = `${prompt}, character isolated on flat solid lime-green green screen background, perfect loop animation, 2d game sprite, full body view, pixel art style, game asset`;

  const ai = new GoogleGenAI({ apiKey });
  
  // Construct config
  const config = {
    aspectRatio: '1:1', // Square ratio is ideal for sprites
    durationSeconds: 5,  // Try to generate 5 second clip
  };

  if (referenceImage) {
    // Newer models (like Veo 3.1) support reference images for consistency
    // The format is usually passed in config as referenceImages
    config.referenceImages = [
      {
        image: {
          inlineBytes: referenceImage // Must be base64 string without data:image/png;base64 prefix
        }
      }
    ];
  }

  try {
    const operation = await ai.models.generateVideos({
      model: model,
      prompt: optimizedPrompt,
      config: config
    });
    
    return operation;
  } catch (error) {
    console.error('Error submitting generation:', error);
    throw error;
  }
}

/**
 * Checks the status of a video generation operation
 * @param {string} apiKey - User's Gemini API Key
 * @param {object} operation - The operation object returned from submitGeneration
 * @returns {Promise<object>} The updated operation status
 */
export async function checkOperation(apiKey, operation) {
  if (!apiKey) {
    throw new Error('API Key is required.');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Poll the operations endpoint
    // Under the hood, the JS SDK maps operations.getVideosOperation or operations.get
    // Let's call operations.get which is standard for general LRO check
    const status = await ai.operations.get({
      operation: operation
    });
    
    return status;
  } catch (error) {
    console.error('Error checking operation:', error);
    throw error;
  }
}

/**
 * Downloads the video content from a generated video URI
 * @param {string} apiKey - User's Gemini API Key
 * @param {string} videoUri - The URI of the video to fetch
 * @returns {Promise<Blob>} The video file content as a Blob
 */
export async function downloadVideo(apiKey, videoUri) {
  if (!apiKey) {
    throw new Error('API Key is required to download.');
  }

  try {
    // As researched, we fetch the URI passing the x-goog-api-key header
    const response = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    const blob = await response.blob();
    return blob;
  } catch (error) {
    console.error('Error downloading video:', error);
    throw error;
  }
}
