
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI client with the API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getEncouragement(name: string, age: number, score: number) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `L'enfant s'appelle ${name}, a ${age} ans et a actuellement un score de ${score} points. 
      Génère un court message d'encouragement (maximum 2 phrases) très positif et adapté à son âge.
      S'il a beaucoup de points, félicite-le. S'il en a peu, encourage-le à faire des efforts.`,
      config: {
        temperature: 0.8,
      },
    });
    return response.text || "Continue comme ça, champion !";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Tu fais du super travail !";
  }
}

export async function getBehaviorSuggestions(age: number) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Génère une liste de 3 idées de "services rendus" ou "bons comportements" adaptés à un enfant de ${age} ans.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              task: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        }
      },
    });
    
    const text = response.text;
    if (!text) throw new Error("Empty response");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [
      { task: "Ranger les jouets", description: "Mettre tous les jouets dans le bac." },
      { task: "Mettre la table", description: "Aider papa et maman pour le repas." }
    ];
  }
}

export async function suggestAvatar(name: string, age: number, passion: string | undefined, avatarUrls: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse le profil de l'enfant suivant :
      Nom : ${name}
      Âge : ${age} ans
      Passion : ${passion || "Non spécifiée"}
      
      Parmi cette liste d'URLs d'avatars, choisis l'index (0 à ${avatarUrls.length - 1}) de celui qui correspondrait le mieux à sa personnalité ou à ses goûts probables.
      Liste des avatars : ${avatarUrls.join(', ')}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selectedIndex: { type: Type.INTEGER, description: "L'index choisi dans la liste fournie" },
            reason: { type: Type.STRING, description: "Brève explication du choix" }
          },
          required: ["selectedIndex"]
        }
      }
    });
    
    const data = JSON.parse(response.text || "{}");
    return data.selectedIndex ?? Math.floor(Math.random() * avatarUrls.length);
  } catch (error) {
    console.error("Gemini Avatar Suggestion Error:", error);
    return Math.floor(Math.random() * avatarUrls.length);
  }
}
