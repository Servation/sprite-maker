/**
 * Helper to prepare the ComfyUI workflow JSON by replacing prompt placeholders
 * @param {object} workflow - The ComfyUI API workflow JSON
 * @param {string} promptText - The user prompt text
 * @returns {object} The updated workflow JSON
 */
export function prepareComfyWorkflow(workflow, promptText) {
  const ws = JSON.parse(JSON.stringify(workflow));
  let replaced = false;

  // 1. Look for any text inputs containing "{{prompt}}" and replace it
  for (const nodeId in ws) {
    const node = ws[nodeId];
    if (node.inputs) {
      for (const inputKey in node.inputs) {
        if (typeof node.inputs[inputKey] === 'string' && node.inputs[inputKey].includes('{{prompt}}')) {
          node.inputs[inputKey] = node.inputs[inputKey].replace('{{prompt}}', promptText);
          replaced = true;
        }
      }
    }
  }

  // 2. If no {{prompt}} was found, find the first CLIPTextEncode node and replace its text
  if (!replaced) {
    for (const nodeId in ws) {
      const node = ws[nodeId];
      if (node.class_type === 'CLIPTextEncode' && node.inputs && typeof node.inputs.text === 'string') {
        node.inputs.text = promptText;
        break;
      }
    }
  }
  return ws;
}

/**
 * Default ComfyUI API workflow for text-to-image (SD 1.5, batch size 16 to simulate video frames)
 */
export const DEFAULT_COMFY_WORKFLOW = {
  "3": {
    "inputs": {
      "seed": 42,
      "steps": 20,
      "cfg": 8,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler"
  },
  "4": {
    "inputs": {
      "ckpt_name": "v1-5-pruned-emaonly.safetensors"
    },
    "class_type": "CheckpointLoaderSimple"
  },
  "5": {
    "inputs": {
      "width": 512,
      "height": 512,
      "batch_size": 16
    },
    "class_type": "EmptyLatentImage"
  },
  "6": {
    "inputs": {
      "text": "{{prompt}}",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "7": {
    "inputs": {
      "text": "blurry, low quality, distortion, text, watermark, signature",
      "clip": ["4", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "8": {
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    },
    "class_type": "VAEDecode"
  },
  "9": {
    "inputs": {
      "filename_prefix": "SpriteMaker",
      "images": ["8", 0]
    },
    "class_type": "SaveImage"
  }
};

/**
 * Submits a prompt to ComfyUI
 * @param {string} serverUrl - ComfyUI Server Url (e.g. http://localhost:8188)
 * @param {object} workflow - ComfyUI API format JSON
 * @param {string} promptText - User description prompt
 * @param {string} clientId - Unique client UUID for WebSocket association
 * @returns {Promise<object>} Resolves to the prompt queue response (prompt_id)
 */
export async function submitComfyPrompt(serverUrl, workflow, promptText, clientId) {
  const cleanUrl = serverUrl.replace(/\/$/, '');
  
  // Optimize prompt with sprite loop helper tokens
  const optimizedPrompt = `${promptText}, character isolated on flat solid lime-green green screen background, perfect loop animation, 2d game sprite, full body view, pixel art style, game asset`;
  const preparedWorkflow = prepareComfyWorkflow(workflow || DEFAULT_COMFY_WORKFLOW, optimizedPrompt);

  const response = await fetch(`${cleanUrl}/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: preparedWorkflow,
      client_id: clientId
    })
  });

  if (!response.ok) {
    throw new Error(`ComfyUI submission failed: ${response.statusText}`);
  }

  return await response.json(); // returns { prompt_id, number, node_errors }
}

/**
 * Submits prompt to Automatic1111 txt2img API
 * @param {string} serverUrl - A1111 server URL (e.g. http://localhost:7860)
 * @param {string} promptText - User prompt
 * @returns {Promise<Blob>} The generated image file content as a Blob
 */
export async function submitA1111Prompt(serverUrl, promptText) {
  const cleanUrl = serverUrl.replace(/\/$/, '');
  const optimizedPrompt = `${promptText}, character isolated on flat solid lime-green green screen background, 2d game sprite, full body view, pixel art style, game asset, sprite sheet grid`;

  const response = await fetch(`${cleanUrl}/sdapi/v1/txt2img`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: optimizedPrompt,
      negative_prompt: "blurry, low quality, distortion, text, watermark, signature",
      steps: 20,
      width: 512,
      height: 512,
      batch_size: 1
    })
  });

  if (!response.ok) {
    throw new Error(`Automatic1111 generation failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.images || data.images.length === 0) {
    throw new Error('No images returned from Automatic1111.');
  }

  const base64Data = data.images[0];
  const imageResponse = await fetch(`data:image/png;base64,${base64Data}`);
  return await imageResponse.blob();
}
