// Cargador de variables de entorno para el frontend
class EnvLoader {
    constructor() {
        this.config = {};
        this.loadConfig();
    }

    async loadConfig() {
        try {
            // Intentar cargar desde un archivo de configuración
            const response = await fetch('/config.json');
            if (response.ok) {
                this.config = await response.json();
                console.log('✅ Configuración cargada desde config.json');
            } else {
                // Fallback a configuración por defecto
                this.loadDefaultConfig();
                console.log('⚠️ Usando configuración por defecto');
            }
        } catch (error) {
            console.log('⚠️ Error cargando configuración, usando valores por defecto');
            this.loadDefaultConfig();
        }
    }

    loadDefaultConfig() {
        this.config = {
            HUGGING_FACE_TOKEN: '',
            CHATBOT_MODEL: 'microsoft/DialoGPT-large',
            CHATBOT_MAX_LENGTH: 150,
            CHATBOT_TEMPERATURE: 0.7,
            NODE_ENV: 'development'
        };
    }

    get(key, defaultValue = '') {
        return this.config[key] || defaultValue;
    }

    getHuggingFaceToken() {
        return this.get('HUGGING_FACE_TOKEN');
    }

    getChatbotConfig() {
        return {
            model: this.get('CHATBOT_MODEL', 'microsoft/DialoGPT-large'),
            maxLength: parseInt(this.get('CHATBOT_MAX_LENGTH', 150)),
            temperature: parseFloat(this.get('CHATBOT_TEMPERATURE', 0.7))
        };
    }

    isDevelopment() {
        return this.get('NODE_ENV', 'development') === 'development';
    }
}

// Crear instancia global
window.envLoader = new EnvLoader();

// Exportar para uso en módulos
export default window.envLoader;
