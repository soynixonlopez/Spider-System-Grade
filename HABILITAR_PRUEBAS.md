# Habilitar Pruebas de Estudiantes

## Para Habilitar las Pruebas

Si quieres ejecutar las pruebas de creación de estudiantes, sigue estos pasos:

### 1. Habilitar el Script de Pruebas

Edita el archivo `public/dashboard-admin.html` y descomenta la línea:

```html
<!-- Cambiar de: -->
<!-- <script type="module" src="js/test-student-creation.js"></script> -->

<!-- A: -->
<script type="module" src="js/test-student-creation.js"></script>
```

### 2. Ejecutar las Pruebas

Una vez habilitado, las pruebas se ejecutarán automáticamente cuando:
- Abras el dashboard de administrador
- El sistema esté en modo desarrollo (localhost o 127.0.0.1)
- El dashboard se haya cargado completamente

### 3. Verificar los Resultados

Abre la consola del navegador (F12) y verifica que aparezcan los mensajes:

```
🧪 Loading student creation test script...
🧪 Student creation test script loaded
🧪 Running student creation tests...
✅ Admin dashboard functions available
🧪 Testing student creation...
✅ Level assignment test passed
📧 Generated email: test.student2025@motta.superate.org.pa
🔑 Generated passcode: ABC123
✅ Student creation test completed
🧪 Testing form synchronization...
✅ Level fields found
🔄 Set individual level to Senior
📊 Individual level: Senior
📊 Bulk level: Senior
✅ Form synchronization test passed
🧪 Testing UI updates...
✅ Students list element found
✅ Students list has content
🎉 All tests completed
```

## Para Deshabilitar las Pruebas

Simplemente comenta la línea nuevamente:

```html
<!-- <script type="module" src="js/test-student-creation.js"></script> -->
```

## Pruebas Manuales

También puedes ejecutar las pruebas manualmente desde la consola:

```javascript
// Verificar que las funciones estén disponibles
window.testStudentCreation();
window.testFormSynchronization();
window.testUIUpdates();
```

## Notas Importantes

- Las pruebas solo se ejecutan en entorno de desarrollo (localhost)
- No afectan el funcionamiento normal del sistema
- Son útiles para verificar que las correcciones funcionen correctamente
- Se pueden deshabilitar fácilmente para producción
