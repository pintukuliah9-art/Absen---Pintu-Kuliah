import { GoogleGenAI } from "@google/genai";

// Function to get the latest API key
const getApiKey = () => {
  return process.env.GEMINI_API_KEY;
};

export const generateLeaveReason = async (reason: string, type: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return reason;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Saya adalah seorang karyawan yang ingin mengajukan ${type}.
      Alasan mentah saya adalah: "${reason}".
      Tolong buatkan alasan yang lebih formal, sopan, dan profesional dalam Bahasa Indonesia untuk diajukan kepada atasan saya.
      Gunakan bahasa yang meyakinkan namun tetap rendah hati.
      Cukup berikan teks alasannya saja tanpa pembuka/penutup surat. Maksimal 2 kalimat.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Anda adalah asisten HR profesional yang ahli dalam korespondensi bisnis Bahasa Indonesia."
      }
    });
    
    if (!response.text) {
      console.warn("Gemini returned empty response text");
      return reason;
    }

    return response.text.trim();
  } catch (error: any) {
    console.error("Gemini Error (generateLeaveReason):", error);
    // Log more details if available
    if (error.response) {
      console.error("Gemini Error Response:", error.response);
    }
    return reason;
  }
};

export const analyzePerformance = async (attendanceSummary: string, userName: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "AI Insights unavailable in demo mode without API Key.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Berikut adalah ringkasan absensi karyawan bernama ${userName} bulan ini:
      ${attendanceSummary}
      
      Berikan analisis singkat (maksimal 40 kata) tentang performa kehadiran mereka. 
      Jika performanya bagus, berikan pujian yang tulus. Jika ada keterlambatan atau alpha, berikan saran perbaikan yang memotivasi.
      Gunakan Bahasa Indonesia yang ramah dan profesional.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Anda adalah asisten HR yang ramah, memotivasi, dan suportif."
      }
    });

    if (!response.text) {
      console.warn("Gemini returned empty response text");
      return "Terus pertahankan kinerja yang baik!";
    }

    return response.text.trim();
  } catch (error: any) {
    console.error("Gemini Error (analyzePerformance):", error);
    if (error.response) {
      console.error("Gemini Error Response:", error.response);
    }
    return "Analisis data tidak tersedia saat ini.";
  }
};
