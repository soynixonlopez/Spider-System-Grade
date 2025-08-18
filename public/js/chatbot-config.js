// Configuración del Chatbot
// ⚠️ IMPORTANTE: Para producción, configurar el token de Hugging Face aquí
// o usar variables de entorno

export const CHATBOT_CONFIG = {
    // Token de Hugging Face - configurar en producción
    // Para desarrollo, dejar vacío para usar respuestas basadas en Firebase
    HUGGING_FACE_TOKEN: '',
    
    // Modelo de Hugging Face a usar
    HUGGING_FACE_MODEL: 'microsoft/DialoGPT-large',
    
    // Configuración de la API
    API_URL: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
    
    // Configuración de respuestas
    MAX_RESPONSE_LENGTH: 150,
    TEMPERATURE: 0.7,
    
    // Configuración del chatbot
    WELCOME_MESSAGE_ENABLED: true,
    TYPING_INDICATOR_ENABLED: true,
    
    // Configuración de Firebase
    FIREBASE_FALLBACK_ENABLED: true
};

// Función para obtener el token de forma segura
export function getHuggingFaceToken() {
    // En desarrollo, usar variable de entorno o configuración local
    if (CHATBOT_CONFIG.HUGGING_FACE_TOKEN) {
        return CHATBOT_CONFIG.HUGGING_FACE_TOKEN;
    }
    
    // En producción, podrías obtenerlo de variables de entorno
    // return process.env.HUGGING_FACE_TOKEN || '';
    
    return '';
}

// Función para verificar si el chatbot está configurado correctamente
export function isChatbotConfigured() {
    return !!getHuggingFaceToken();
}
