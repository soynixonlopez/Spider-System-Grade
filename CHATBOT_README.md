# 🤖 Chatbot de Spider System

## Descripción

El chatbot de Spider System es un asistente virtual inteligente que proporciona ayuda contextual a los usuarios del sistema educativo. Utiliza la API de Hugging Face para generar respuestas inteligentes basadas en el contexto del usuario y su rol en el sistema.

## Características

### 🎯 Funcionalidades Principales

- **Asistencia Contextual**: El chatbot adapta sus respuestas según el rol del usuario (admin, profesor, estudiante)
- **Integración con Hugging Face**: Utiliza modelos de IA avanzados para generar respuestas naturales
- **Interfaz Moderna**: Diseño responsive y animaciones suaves
- **Ubicación Estratégica**: Botón flotante en la esquina inferior izquierda de todos los dashboards

### 🎨 Diseño y UX

- **Botón Flotante**: Icono de chat con gradiente atractivo
- **Ventana Emergente**: Interfaz de chat moderna con animaciones
- **Indicador de Escritura**: Animación de puntos mientras el bot "piensa"
- **Responsive**: Se adapta a dispositivos móviles y desktop
- **Tema Consistente**: Colores y estilos que coinciden con Spider System

### 🔧 Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Módulos ES6)
- **IA**: Hugging Face Inference API
- **Modelo**: microsoft/DialoGPT-large
- **Base de Datos**: Firebase Firestore
- **Estilos**: CSS personalizado con animaciones y gradientes

## Implementación

### Archivos Creados

1. **`public/css/chatbot.css`** - Estilos del chatbot
2. **`public/js/chatbot.js`** - Lógica principal del chatbot
3. **`public/js/chatbot-config.js`** - Configuración y plantillas de respuestas
4. **`CHATBOT_README.md`** - Esta documentación

### Archivos Modificados

- `public/index.html` - Agregado CSS y JS del chatbot
- `public/dashboard-admin.html` - Agregado CSS y JS del chatbot
- `public/dashboard-teacher.html` - Agregado CSS y JS del chatbot
- `public/dashboard-student.html` - Agregado CSS y JS del chatbot

```

### Modelo de IA

Se utiliza el modelo `microsoft/DialoGPT-large` que es:
- Optimizado para conversaciones naturales en español
- Mejor calidad de respuestas
- Entrenado específicamente para diálogos
- Balanceado entre velocidad y calidad

## Funcionalidades por Rol

### 👨‍💼 Administrador
- Gestión de estudiantes y profesores
- Administración de asignaturas y promociones
- Consultas sobre calificaciones del sistema
- Configuración del sistema educativo
- Reportes y estadísticas

### 👨‍🏫 Profesor
- Gestión de calificaciones de estudiantes
- Consultas sobre asignaturas que imparte
- Estadísticas de rendimiento académico
- Herramientas de evaluación
- Reportes de estudiantes

### 👨‍🎓 Estudiante
- Consulta de calificaciones y notas
- Información sobre asignaturas
- Promedio general y por materia
- Progreso académico
- Historial de calificaciones

## Uso del Chatbot

### Cómo Abrir
1. Haz clic en el botón flotante con icono de chat (esquina inferior izquierda)
2. La ventana del chatbot se abrirá con una animación suave
3. El bot te dará la bienvenida según tu rol

### Cómo Usar
1. Escribe tu pregunta en el campo de texto
2. Presiona Enter o haz clic en el botón de enviar
3. El bot mostrará un indicador de "escribiendo" mientras procesa
4. Recibirás una respuesta contextual basada en tu rol y la página actual

### Cómo Cerrar
- Haz clic en el botón X en la esquina superior derecha
- Haz clic fuera de la ventana del chatbot
- Haz clic nuevamente en el botón flotante

## Respuestas Inteligentes

### Integración con Firebase
El chatbot se conecta directamente a tu base de datos de Firebase para:
- Obtener datos reales de estudiantes, asignaturas y calificaciones
- Proporcionar estadísticas actualizadas
- Responder con información específica del sistema

### Detección de Intenciones
El chatbot detecta automáticamente:
- En qué dashboard estás (admin, profesor, estudiante)
- Tu rol en el sistema
- La intención de tu pregunta (estudiantes, asignaturas, calificaciones, etc.)
- Datos disponibles según el contexto

### Respuestas Contextuales
Si la API de Hugging Face no está disponible, el chatbot proporciona respuestas inteligentes basadas en:
- Datos reales de Firebase
- Palabras clave en el mensaje
- Rol del usuario
- Contexto de la página actual

## Personalización

### Cambiar el Modelo de IA
Para cambiar el modelo, modifica la línea en `chatbot.js`:
```javascript
this.apiUrl = 'https://api-inference.huggingface.co/models/TU_MODELO_AQUI';
```

### Modificar Estilos
Los estilos se pueden personalizar editando `chatbot.css`:
- Colores del gradiente
- Tamaños y posiciones
- Animaciones
- Responsive design

### Agregar Nuevas Respuestas
Para agregar respuestas personalizadas, modifica la función `getFallbackResponse()` en `chatbot.js`.

## Troubleshooting

### Problemas Comunes

1. **El chatbot no aparece**
   - Verifica que los archivos CSS y JS estén incluidos
   - Revisa la consola del navegador para errores

2. **No responde a mensajes**
   - Verifica la conexión a internet
   - Revisa si el token de Hugging Face es válido
   - Consulta la consola para errores de API

3. **Errores de CORS**
   - El chatbot usa la API pública de Hugging Face
   - Si hay problemas, verifica la configuración del navegador

### Logs y Debug
El chatbot incluye logs en la consola para debugging:
- Errores de API
- Estado del chatbot
- Mensajes procesados

## Seguridad

### Token de API
- El token está incluido en el código frontend
- Para producción, considera usar variables de entorno
- El token tiene límites de uso de Hugging Face

### Datos del Usuario
- No se almacenan conversaciones permanentemente
- Los mensajes se procesan en tiempo real
- No se envían datos sensibles a la API

## Mejoras Futuras

### Funcionalidades Planificadas
- [ ] Historial de conversaciones
- [ ] Respuestas más específicas por asignatura
- [ ] Integración con la base de datos de Firebase
- [ ] Notificaciones push
- [ ] Soporte para archivos adjuntos

### Optimizaciones
- [ ] Cache de respuestas frecuentes
- [ ] Modelo local para respuestas básicas
- [ ] Mejora en la detección de contexto
- [ ] Soporte para múltiples idiomas

## Soporte

Para reportar problemas o solicitar mejoras:
1. Revisa esta documentación
2. Consulta los logs en la consola del navegador
3. Verifica la conectividad con Hugging Face
4. Contacta al equipo de desarrollo

---

**Desarrollado para Spider System** 🕷️
*Sistema de Gestión Educativa Inteligente*
