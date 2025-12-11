import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  // Using process.env.API_KEY directly as per guidelines.
  // The guidelines state we must assume it is pre-configured and valid.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateNpcDialogue = async (
  npcRole: string,
  situation: string,
  playerAction: string
): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const prompt = `
    Context: You are an NPC in a GTA-style open world game called 'San Reactos'.
    Role: ${npcRole}
    Current Situation: ${situation}
    Player Action: ${playerAction}

    Task: Generate a very short, punchy line of dialogue (max 15 words) reacting to the player.
    Style: Street slang, casual, sometimes aggressive or funny depending on role.
    Output: Just the text string.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || "...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hey! Watch it!";
  }
};

export const generateMission = async (): Promise<{ title: string; description: string }> => {
  const ai = getAiClient();

  try {
    const prompt = `
    Generate a random, short GTA-style side mission.
    Themes: Gang war, delivery, racing, theft.
    Keep description under 20 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ['title', 'description'],
        },
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text");
    return JSON.parse(text);
  } catch (error) {
    return { title: "Turf War", description: "Take out the rival gang members." };
  }
};