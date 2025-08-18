/**
 * Footer Component
 * Componente reutilizable de footer con políticas de privacidad y cookies
 */

class FooterComponent {
    constructor() {
        this.currentYear = new Date().getFullYear();
        this.init();
    }

    init() {
        console.log('FooterComponent: Initializing...');
        this.createFooter();
        this.createPolicyModals();
        this.bindEvents();
        console.log('FooterComponent: Initialized successfully');
    }

    createFooter() {
        console.log('FooterComponent: Creating footer...');
        const footerHTML = `
            <footer class="footer-component">
                <div class="footer-content">
                    <div class="footer-main">
                        <p class="footer-copyright">
                            © ${this.currentYear} By Nixon Lopez. Todos los derechos reservados.
                        </p>
                        <p class="footer-subtitle">
                            Sistema de Calificaciones creado con ❤️ para Programa Superate Fundación Alberto Motta
                        </p>
                    </div>
                    <div class="footer-links">
                        <a href="#" class="footer-link" data-policy="privacy">
                            Política de Privacidad
                        </a>
                        <div class="footer-divider"></div>
                        <a href="#" class="footer-link" data-policy="cookies">
                            Política de Cookies
                        </a>
                    </div>
                </div>
            </footer>
        `;

        // Insertar el footer al final del body
        document.body.insertAdjacentHTML('beforeend', footerHTML);
        console.log('FooterComponent: Footer created and inserted');
    }

    createPolicyModals() {
        const modalsHTML = `
            <!-- Privacy Policy Modal -->
            <div id="privacyModal" class="policy-modal">
                <div class="policy-modal-content">
                    <div class="policy-modal-header">
                        <h2 class="policy-modal-title">Política de Privacidad</h2>
                        <button class="policy-modal-close" onclick="footerComponent.closeModal('privacyModal')">
                            &times;
                        </button>
                    </div>
                    <div class="policy-modal-body">
                        <p><strong>Última actualización:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
                        
                        <h3>1. Información que Recopilamos</h3>
                        <p>Recopilamos información que usted nos proporciona directamente, como cuando:</p>
                        <ul>
                            <li>Se registra en el sistema</li>
                            <li>Inicia sesión en su cuenta</li>
                            <li>Actualiza su información de perfil</li>
                            <li>Interactúa con el sistema educativo</li>
                        </ul>

                        <h3>2. Tipos de Información</h3>
                        <h4>Información Personal:</h4>
                        <ul>
                            <li>Nombre y apellidos</li>
                            <li>Dirección de correo electrónico</li>
                            <li>Información académica</li>
                            <li>Rol en el sistema (estudiante, profesor, administrador)</li>
                        </ul>

                        <h4>Información de Uso:</h4>
                        <ul>
                            <li>Actividad en el sistema</li>
                            <li>Calificaciones y evaluaciones</li>
                            <li>Interacciones con materias y promociones</li>
                        </ul>

                        <h3>3. Cómo Utilizamos su Información</h3>
                        <p>Utilizamos la información recopilada para:</p>
                        <ul>
                            <li>Proporcionar y mantener el sistema educativo</li>
                            <li>Gestionar calificaciones y evaluaciones</li>
                            <li>Comunicarnos con usted sobre su cuenta</li>
                            <li>Mejorar nuestros servicios</li>
                            <li>Cumplir con obligaciones legales</li>
                        </ul>

                        <h3>4. Compartir Información</h3>
                        <p>No vendemos, alquilamos ni compartimos su información personal con terceros, excepto:</p>
                        <ul>
                            <li>Con su consentimiento explícito</li>
                            <li>Para cumplir con obligaciones legales</li>
                            <li>Para proteger nuestros derechos y seguridad</li>
                        </ul>

                        <h3>5. Seguridad de Datos</h3>
                        <p>Implementamos medidas de seguridad técnicas y organizativas para proteger su información personal contra acceso no autorizado, alteración, divulgación o destrucción.</p>

                        <h3>6. Sus Derechos</h3>
                        <p>Usted tiene derecho a:</p>
                        <ul>
                            <li>Acceder a su información personal</li>
                            <li>Corregir información inexacta</li>
                            <li>Solicitar la eliminación de sus datos</li>
                            <li>Oponerse al procesamiento de sus datos</li>
                            <li>Portabilidad de datos</li>
                        </ul>

                        <h3>7. Contacto</h3>
                        <p>Para cualquier pregunta sobre esta política de privacidad, puede contactarnos a través del administrador del sistema.</p>
                    </div>
                </div>
            </div>

            <!-- Cookies Policy Modal -->
            <div id="cookiesModal" class="policy-modal">
                <div class="policy-modal-content">
                    <div class="policy-modal-header">
                        <h2 class="policy-modal-title">Política de Cookies</h2>
                        <button class="policy-modal-close" onclick="footerComponent.closeModal('cookiesModal')">
                            &times;
                        </button>
                    </div>
                    <div class="policy-modal-body">
                        <p><strong>Última actualización:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
                        
                        <h3>1. ¿Qué son las Cookies?</h3>
                        <p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita nuestro sitio web. Nos ayudan a mejorar su experiencia y a entender cómo utiliza nuestro sistema.</p>

                        <h3>2. Tipos de Cookies que Utilizamos</h3>
                        
                        <h4>Cookies Esenciales:</h4>
                        <p>Estas cookies son necesarias para el funcionamiento básico del sistema:</p>
                        <ul>
                            <li><strong>Cookies de Sesión:</strong> Mantienen su sesión activa mientras utiliza el sistema</li>
                            <li><strong>Cookies de Autenticación:</strong> Verifican su identidad y permisos de acceso</li>
                            <li><strong>Cookies de Seguridad:</strong> Protegen contra ataques y fraudes</li>
                        </ul>

                        <h4>Cookies de Funcionalidad:</h4>
                        <p>Mejoran la funcionalidad y personalización:</p>
                        <ul>
                            <li><strong>Preferencias:</strong> Recuerdan sus configuraciones y preferencias</li>
                            <li><strong>Idioma:</strong> Mantienen su idioma preferido</li>
                            <li><strong>Tema:</strong> Conservan su tema visual preferido</li>
                        </ul>

                        <h4>Cookies de Rendimiento:</h4>
                        <p>Nos ayudan a mejorar el rendimiento del sistema:</p>
                        <ul>
                            <li><strong>Análisis:</strong> Recopilan información sobre cómo utiliza el sistema</li>
                            <li><strong>Errores:</strong> Nos ayudan a identificar y corregir problemas</li>
                            <li><strong>Optimización:</strong> Mejoran la velocidad y eficiencia</li>
                        </ul>

                        <h3>3. Cookies de Terceros</h3>
                        <p>Utilizamos servicios de terceros que pueden establecer cookies:</p>
                        <ul>
                            <li><strong>Firebase:</strong> Para autenticación y base de datos</li>
                            <li><strong>Google Analytics:</strong> Para análisis de uso (si está habilitado)</li>
                            <li><strong>Servicios de Hosting:</strong> Para el funcionamiento del sistema</li>
                        </ul>

                        <h3>4. Gestión de Cookies</h3>
                        <p>Puede controlar las cookies de las siguientes maneras:</p>
                        <ul>
                            <li><strong>Configuración del Navegador:</strong> Puede configurar su navegador para rechazar cookies</li>
                            <li><strong>Eliminación Manual:</strong> Puede eliminar las cookies existentes</li>
                            <li><strong>Modo Privado:</strong> Utilizar el modo de navegación privada</li>
                        </ul>

                        <h3>5. Consecuencias de Deshabilitar Cookies</h3>
                        <p>Si deshabilita las cookies, es posible que:</p>
                        <ul>
                            <li>No pueda iniciar sesión en el sistema</li>
                            <li>Pierda sus preferencias y configuraciones</li>
                            <li>Experimente problemas de funcionalidad</li>
                            <li>No pueda acceder a ciertas características</li>
                        </ul>

                        <h3>6. Actualizaciones de la Política</h3>
                        <p>Esta política puede actualizarse periódicamente. Le notificaremos sobre cambios significativos a través del sistema o por correo electrónico.</p>

                        <h3>7. Contacto</h3>
                        <p>Para preguntas sobre nuestra política de cookies, contacte al administrador del sistema.</p>
                    </div>
                </div>
            </div>
        `;

        // Insertar los modales al final del body
        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    bindEvents() {
        // Event listeners para los enlaces de políticas
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('footer-link')) {
                e.preventDefault();
                const policy = e.target.getAttribute('data-policy');
                this.openModal(`${policy}Modal`);
            }
        });

        // Cerrar modal al hacer clic fuera del contenido
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('policy-modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Cerrar modal con la tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.policy-modal.show');
                if (openModal) {
                    this.closeModal(openModal.id);
                }
            }
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Restaurar scroll del body
        }
    }
}

// Inicializar el componente cuando el DOM esté listo
let footerComponent;
document.addEventListener('DOMContentLoaded', () => {
    footerComponent = new FooterComponent();
});

// Exportar para uso global
window.footerComponent = footerComponent;
