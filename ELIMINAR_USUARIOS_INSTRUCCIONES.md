# 📋 Instrucciones para Eliminar Usuarios de Firebase Auth

## 🎯 **Situación Actual:**
- Los usuarios se eliminan automáticamente de **Firestore** (base de datos)
- Los usuarios **NO se eliminan** de **Firebase Auth** (por seguridad)
- Esto es normal y esperado

## 🔧 **Cómo Eliminar Usuarios de Firebase Auth Manualmente:**

### **Opción 1: Firebase Console (Recomendado)**

1. **Ve a Firebase Console:**
   - https://console.firebase.google.com
   - Selecciona tu proyecto: `spidersystem-ce9a6`

2. **Navega a Authentication:**
   - En el menú lateral, haz clic en **"Authentication"**
   - Luego haz clic en **"Users"**

3. **Encuentra y elimina usuarios:**
   - Busca el usuario por email o UID
   - Haz clic en los **3 puntos** (⋮) junto al usuario
   - Selecciona **"Delete user"**
   - Confirma la eliminación

### **Opción 2: Actualizar a Plan Blaze (Para Eliminación Automática)**

Si quieres eliminación automática, actualiza a **Blaze (pay-as-you-go)**:

1. **Ve a Firebase Console:**
   - https://console.firebase.google.com/project/spidersystem-ce9a6/usage/details

2. **Actualiza a Blaze:**
   - Haz clic en **"Modify plan"**
   - Selecciona **"Blaze (Pay as you go)"**
   - Confirma la actualización

3. **Beneficios del Plan Blaze:**
   - ✅ **Tier gratuito generoso** (2M invocaciones/mes)
   - ✅ **Cloud Functions** para eliminación automática
   - ✅ **Solo pagas si excedes límites** (muy difícil)
   - ✅ **Eliminación automática** de usuarios

## 💰 **Costos del Plan Blaze:**

### **Tier Gratuito (Incluido):**
- **Cloud Functions:** 2,000,000 invocaciones/mes
- **Firestore:** 1GB almacenamiento + 50K lecturas + 20K escrituras/día
- **Authentication:** 10,000 usuarios
- **Hosting:** 10GB transferencia/mes

### **Solo pagas si excedes estos límites:**
- **Cloud Functions:** $0.40 por millón de invocaciones adicionales
- **Firestore:** $0.18 por GB adicional
- **Authentication:** $0.01 por usuario adicional

## 🎯 **Recomendación:**

Para un sistema escolar pequeño/mediano:
- **Plan Blaze es prácticamente gratuito**
- **Muy difícil exceder los límites gratuitos**
- **Mejor experiencia de usuario** (eliminación automática)

## 📝 **Nota Importante:**

Los usuarios eliminados de Firestore **NO pueden hacer login** aunque estén en Auth, porque:
- No tienen documento en la base de datos
- El sistema verifica la existencia del documento
- Es seguro dejarlos en Auth temporalmente

---

**¿Necesitas ayuda con algo más?** 🤔
