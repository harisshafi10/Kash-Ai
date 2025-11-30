import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { Attachment, Message, Role } from '../types';

// Initialize the client
// Ideally process.env.API_KEY is available. In a real Next.js app, this would be on the server side.
// For this React SPA wrapper, we assume the environment has the key.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Converts a Message array to the format expected by Gemini 2.5 SDK
 */
const formatHistory = (messages: Message[]) => {
  return messages.map(msg => {
    const parts: Part[] = [];
    
    // Add text content
    if (msg.content) {
      parts.push({ text: msg.content });
    }

    // Add attachments (Images/PDFs)
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        // Remove the data url prefix (e.g., "data:image/png;base64,") to get raw base64
        const cleanBase64 = att.base64.split(',')[1];
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: cleanBase64
          }
        });
      });
    }

    return {
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: parts
    };
  });
};

export const streamGeminiResponse = async (
  history: Message[],
  currentPrompt: string,
  attachments: Attachment[],
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    // 1. Prepare the model
    // Note: We are using a fresh chat instance for each turn to maintain manual control over history
    // strictly following the stateless prompt model or managing history manually.
    // However, ai.chats.create is better for multi-turn.
    
    // Filter out the very last message if it was optimistically added to UI state, 
    // but here we pass previous history and the new message separately.
    const formattedHistory = formatHistory(history);

    const chat = ai.chats.create({
      model: MODEL_NAME,
      history: formattedHistory,
      config: {
        systemInstruction: "You are Kash Ai, a helpful, witty, and precise AI assistant created by Haris Shafi. You prefer using Markdown to format your responses effectively.",
      }
    });

    // 2. Prepare current message parts
    const currentParts: Part[] = [{ text: currentPrompt }];
    
    if (attachments.length > 0) {
      attachments.forEach(att => {
        const cleanBase64 = att.base64.split(',')[1];
        currentParts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: cleanBase64
          }
        });
      });
    }

    // 3. Send message and stream
    const result = await chat.sendMessageStream({ 
      message: { 
        role: 'user', 
        parts: currentParts 
      } 
    });

    let fullText = "";

    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        onChunk(c.text);
      }
    }

    return fullText;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
