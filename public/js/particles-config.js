// Particles.js Configuration for Spider Web Effect
// This configuration creates a spider web-like effect with connected particles

const particlesConfig = {
    particles: {
        number: {
            value: 200,
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: '#3b82f6'
        },
        shape: {
            type: 'circle',
            stroke: {
                width: 0,
                color: '#000000'
            }
        },
        opacity: {
            value: 0.6,
            random: true,
            anim: {
                enable: true,
                speed: 1,
                opacity_min: 0.1,
                sync: false
            }
        },
        size: {
            value: 3,
            random: true,
            anim: {
                enable: true,
                speed: 2,
                size_min: 1,
                sync: false
            }
        },
        line_linked: {
            enable: true,
            distance: 200,
            color: '#3b82f6',
            opacity: 0.4,
            width: 1.5
        },
        move: {
            enable: true,
            speed: 1.2,
            direction: 'none',
            random: true,
            straight: false,
            out_mode: 'bounce',
            bounce: true,
            attract: {
                enable: true,
                rotateX: 300,
                rotateY: 600
            }
        }
    },
    interactivity: {
        detect_on: 'canvas',
        events: {
            onhover: {
                enable: true,
                mode: 'repulse'
            },
            onclick: {
                enable: true,
                mode: 'push'
            },
            resize: true
        },
        modes: {
            repulse: {
                distance: 150,
                duration: 0.8
            },
            push: {
                particles_nb: 4
            }
        }
    },
    retina_detect: true
};

// Function to initialize particles
function initParticles(containerId = 'particles-js') {
    if (typeof particlesJS !== 'undefined') {
        particlesJS(containerId, particlesConfig);
    } else {
        console.warn('Particles.js not loaded. Make sure to include the particles.js library before calling initParticles().');
    }
}

// Function to destroy particles
function destroyParticles(containerId = 'particles-js') {
    if (typeof pJSDom !== 'undefined' && pJSDom.length > 0) {
        pJSDom.forEach(instance => {
            if (instance.pJS && instance.pJS.fn && instance.pJS.fn.vendors) {
                instance.pJS.fn.vendors.destroypJS();
            }
        });
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { particlesConfig, initParticles, destroyParticles };
} else {
    // Make available globally
    window.particlesConfig = particlesConfig;
    window.initParticles = initParticles;
    window.destroyParticles = destroyParticles;
}
