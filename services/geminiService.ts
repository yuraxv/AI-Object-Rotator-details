import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const buildCloseUpPrompt = (isObjectRotationOnly: boolean): string => {
   if (isObjectRotationOnly) {
      // Prompt for 4 close-ups of the isolated object
      return `
      **Role:** You are an expert 3D object analyst and macro photographer AI.
      **Objective:** Analyze the main subject in the input image and write four distinct, highly-detailed prompts for different close-up (macro) shots of the subject. The subject MUST be isolated and placed on a plain, seamless white background for each shot.

      **Your process MUST follow these steps precisely:**

      **Step 1: Analyze and Identify Key Details.**
      - Examine the input image to identify the main subject.
      - Identify at least four different, visually interesting areas on the subject that are suitable for a detailed close-up shot. Focus on unique textures, materials, branding, or construction details.

      **Step 2: Write Four Distinct Close-up Prompts.**
      - For EACH of the four details identified in Step 1, write a unique and detailed prompt.
      - Each prompt must describe isolating the subject and rendering it on a seamless white background.

      **Prompt Structure Requirements (for EACH of the four prompts):**
      - **Exactly Three Paragraphs:** Each prompt you write must consist of exactly three paragraphs.
      - **Paragraph 1 (Framing & Staging):** Describe the precise part of the object to be framed in the close-up. Command the AI to isolate the entire subject from its original background and place it on a solid, clean, seamless white background, then zoom in on the specified detail.
      - **Paragraph 2 (Lighting & Shadow):** Detail the lighting needed to emphasize the texture and form of the specific detail. Use terms like "soft directional light," "rim lighting," or "specular highlights" to describe how light should interact with the material's surface. Shadows on the ground plane should be subtle and soft.
      - **Paragraph 3 (Micro-details & Texture):** Be extremely specific about the texture, material properties, reflections, and any imperfections of the chosen detail. Describe the tactile quality you want to convey (e.g., "the fine grain of the wood," "the brushed aluminum texture," "the subtle stitching on the leather").

      **Final Output:**
      - Provide your output as a single JSON object.
      - The object must contain one key: "prompts".
      - "prompts" must be an array containing exactly four strings, where each string is one of the three-paragraph prompts you have written.`;
    } else {
      // Prompt for 4 close-ups within the original scene
      return `
      **Role:** You are a world-class virtual cinematographer AI with a specialty in macro photography.
      **Objective:** Analyze the input image and write four distinct, highly-detailed prompts for different cinematic close-up (macro) shots of details within the original scene.

      **Your process MUST follow these steps precisely:**

      **Step 1: Analyze and Identify Key Details.**
      - Examine the entire input image, including the main subject and its environment.
      - Identify at least four different, visually interesting areas suitable for a cinematic close-up shot. These could be on the main subject or part of the background. Focus on compelling textures, light interactions, or narrative details.

      **Step 2: Write Four Distinct Close-up Prompts.**
      - For EACH of the four details identified in Step 1, write a unique and detailed prompt.
      - Each prompt must describe moving a VIRTUAL CAMERA to capture the close-up, maintaining the original scene's context but with a very shallow depth of field.

      **Prompt Structure Requirements (for EACH of the four prompts):**
      - **Exactly Three Paragraphs:** Each prompt you write must consist of exactly three paragraphs.
      - **Paragraph 1 (Camera & Composition):** Describe the new camera position for the close-up. Specify the use of a macro lens, tight framing, and a very shallow depth of field (bokeh) to isolate the detail from its surroundings.
      - **Paragraph 2 (Lighting & Atmosphere):** Describe how the existing light in the scene interacts with the subject of the close-up. Emphasize how light reveals texture, form, and creates mood. Mention highlights, shadows, and reflections on the specific detail.
      - **Paragraph 3 (Subject & Scene Details):** Focus entirely on the textures, materials, and fine details visible in the close-up frame. Describe the tactile quality of the surfaces and the out-of-focus elements in the background that add to the atmosphere.

      **Final Output:**
      - Provide your output as a single JSON object.
      - The object must contain one key: "prompts".
      - "prompts" must be an array containing exactly four strings, where each string is one of the three-paragraph prompts you have written.`;
    }
};

const buildAngleBasedPrompt = (isObjectRotationOnly: boolean, selectedAngles: string[]): string => {
  const angleDefinitions = `
    - **Front:** A direct, head-on view of the subject's primary face.
    - **Side:** A profile view from the left or right.
    - **Back:** A view from directly behind the subject.
    - **Top:** A view from directly above, looking down (plan view).
    - **Three-Quarter:** An angled view between the front and side, showing depth.
    - **Low Angle:** A worm's-eye view, looking up at the subject from below to make it seem imposing.
    - **High Angle:** A bird's-eye view, looking down at the subject from a high angle to make it seem smaller.
    - **Close-up:** A macro shot focusing on a specific, interesting texture or detail.
  `;

  const stagingInstruction = isObjectRotationOnly
    ? `Each prompt must command the AI to isolate the subject from its original background and place it on a solid, clean, seamless white background.`
    : `Each prompt must describe moving a VIRTUAL CAMERA to the new position. The entire scene, including background and lighting, must change realistically according to the new perspective.`;

  return `
    **Role:** You are an expert virtual cinematographer and 3D object analyst AI.
    **Objective:** You will be given a list of exactly four desired camera angles. Your task is to write four distinct, highly-detailed prompts, one for each requested angle, based on the input image.

    **Requested Angles:**
    ${selectedAngles.map(angle => `- ${angle}`).join('\n')}

    **Angle Definitions (for your reference):**
    ${angleDefinitions}

    **Your process MUST follow these steps precisely:**

    **Step 1: Write Four Distinct Prompts.**
    - For EACH of the four requested angles, write a unique and detailed prompt.
    - ${stagingInstruction}

    **Prompt Structure Requirements (for EACH of the four prompts):**
    - **Exactly Three Paragraphs:** Each prompt you write must consist of exactly three paragraphs.
    - **Paragraph 1 (Camera & Composition):** Describe the new camera position, angle, and framing for the requested view. Be precise based on the angle's definition.
    - **Paragraph 2 (Lighting & Atmosphere):** Describe the lighting for the new view. Where is the key light coming from? How are shadows cast? How does the light interact with the subject's materials and textures?
    - **Paragraph 3 (Subject & Scene Details):** Describe what is now visible from this new perspective. Emphasize maintaining texture, material, and color consistency with the original image. For a close-up, be extremely specific about the micro-details.

    **Final Output:**
    - Provide your output as a single JSON object.
    - The object must contain one key: "prompts".
    - "prompts" must be an array containing exactly four strings, where each string is one of the three-paragraph prompts you have written in the same order as the requested angles.
  `;
};


export const getRotationPrompts = async (base64Image: string, mimeType: string, isObjectRotationOnly: boolean, isCloseupOnly: boolean, selectedAngles: string[]): Promise<string[]> => {
  let prompt: string;

  if (isCloseupOnly) {
    prompt = buildCloseUpPrompt(isObjectRotationOnly);
  } else if (selectedAngles && selectedAngles.length === 4) {
    prompt = buildAngleBasedPrompt(isObjectRotationOnly, selectedAngles);
  } else {
    throw new Error("Invalid angle selection. Please select exactly 4 angles.");
  }
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });

  try {
    const jsonText = response.text;
    const result = JSON.parse(jsonText);
    if (result && Array.isArray(result.prompts) && result.prompts.length === 4) {
      return result.prompts;
    }
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", e);
    throw new Error("The AI failed to return valid instructions. Please try a different image.");
  }

  throw new Error("Could not get valid prompts from the AI. The response was malformed.");
};

export const generateRotatedImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const newMimeType = part.inlineData.mimeType;
      const newBase64 = part.inlineData.data;
      return `data:${newMimeType};base64,${newBase64}`;
    }
  }

  throw new Error("The AI did not return an image. It might not be able to process this request.");
};
