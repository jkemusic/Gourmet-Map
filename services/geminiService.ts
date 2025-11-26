import { GoogleGenAI } from "@google/genai";
import { Place, Coordinates } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using generic text model for search with grounding tools
const MODEL_NAME = 'gemini-2.5-flash';

export const searchPlacesWithGemini = async (
  query: string, 
  userLocation?: Coordinates
): Promise<Place[]> => {
  try {
    // Enhanced prompt to strictly prioritize location if provided
    const locationPrompt = userLocation ? `Search near the provided location (lat: ${userLocation.latitude}, lng: ${userLocation.longitude}).` : '';
    const prompt = `Find places matching "${query}". ${locationPrompt} Return a list of specific locations. Provide the place name in Traditional Chinese (繁體中文).`;

    const toolConfig: any = {};
    
    // Add location context if available
    if (userLocation) {
      toolConfig.retrievalConfig = {
        latLng: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude
        }
      };
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: toolConfig,
      },
    });

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) return [];

    const groundingChunks = candidates[0].groundingMetadata?.groundingChunks;
    
    if (!groundingChunks) return [];

    const places: Place[] = [];

    // Parse grounding chunks to extract map data
    groundingChunks.forEach((chunk: any) => {
        if (chunk.maps) {
            const mapData = chunk.maps;
             
             if (mapData.title) {
                 places.push({
                     id: mapData.placeId || Math.random().toString(36).substr(2, 9),
                     name: mapData.title,
                     googleMapsUri: mapData.uri,
                     address: mapData.address, 
                     location: {
                         latitude: mapData.center?.latitude || userLocation?.latitude || 0,
                         longitude: mapData.center?.longitude || userLocation?.longitude || 0,
                     }
                 });
             }
        }
    });

    return places;

  } catch (error) {
    console.error("Error searching places:", error);
    return [];
  }
};

// Helper to analyze a photo using Gemini (Bonus feature)
export const analyzeFoodPhoto = async (base64Image: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "請用一句簡短、令人垂涎的繁體中文描述這道食物。" }
                ]
            }
        });
        return response.text || "看起來很美味！";
    } catch (e) {
        return "看起來很美味！";
    }
}