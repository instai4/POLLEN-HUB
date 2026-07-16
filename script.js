const beeModel = document.getElementById("bee-model");
const sections = Array.from(document.querySelectorAll("section"));

const shiftPositions = [0, -20, 0, 25];
const cameraOrbits = [[90, 90], [-45, 90], [-180, 0], [45, 90]];

const sectionOffsets = sections.map(section => section.offsetTop);
const lastSectionIndex = sections.length - 1;

const interpolate = (start, end, progress) => start + (end - start) * progress;

const getScrollProgress = (scrolly) => {
    for (let i = 0; i < lastSectionIndex; i++) {
        if (
            scrolly >= sectionOffsets[i] &&
            scrolly < sectionOffsets[i + 1]
        ) {
            return (
                i +
                (scrolly - sectionOffsets[i]) /
                (sectionOffsets[i + 1] - sectionOffsets[i])
            );
        }
    }
    return lastSectionIndex;
};


        // Mobile nav toggle
        const navToggle = document.getElementById('nav-toggle');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                document.body.classList.toggle('nav-open');
            });
            // Close nav when a nav link is clicked (for mobile)
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => document.body.classList.remove('nav-open'));
            });
        }
// Initialize Lenis Smooth Scroll
let lenis;
if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

// Mouse Position Tracking for Parallax
let mouseX = 0;
let mouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

window.addEventListener("mousemove", (e) => {
    targetMouseX = (e.clientX / window.innerWidth) - 0.5;
    targetMouseY = (e.clientY / window.innerHeight) - 0.5;
});

// Interactive 3D Card Hover Detection — rect cached to avoid per-frame layout thrashing
const interactiveCard = document.querySelector('.interactive-3d-card');
let isHovering3D = false;
let cachedCardRect = null;

// Refresh rect on resize or scroll (card is in the page flow, so its viewport position changes)
const refreshCardRect = () => {
    if (interactiveCard) cachedCardRect = interactiveCard.getBoundingClientRect();
};
refreshCardRect();
window.addEventListener('resize', refreshCardRect, { passive: true });
window.addEventListener('scroll', refreshCardRect, { passive: true });

if (interactiveCard) {
    window.addEventListener('mousemove', (e) => {
        if (!cachedCardRect) return;
        const insideX = e.clientX >= cachedCardRect.left && e.clientX <= cachedCardRect.right;
        const insideY = e.clientY >= cachedCardRect.top && e.clientY <= cachedCardRect.bottom;

        if (insideX && insideY) {
            if (!isHovering3D) {
                isHovering3D = true;
                beeModel.classList.add('interactive-mode');
                beeModel.setAttribute('camera-controls', '');
                beeModel.style.pointerEvents = 'auto';
            }
        } else {
            if (isHovering3D) {
                isHovering3D = false;
                beeModel.classList.remove('interactive-mode');
                beeModel.removeAttribute('camera-controls');
                beeModel.style.pointerEvents = 'none';
            }
        }
    }, { passive: true });
}

// Lerp-based Animation Loop for the 3D Bee Model
let currentScrollProgress = 0;
let currentTranslateX = 0;
let currentOrbitX = 90;
let currentOrbitY = 90;

const updateModel = () => {
    if (isHovering3D) {
        requestAnimationFrame(updateModel);
        return;
    }

    const currentScrollY = window.scrollY;
    const targetScrollProgress = getScrollProgress(currentScrollY);
    
    // Smoothly interpolate scroll progress
    currentScrollProgress += (targetScrollProgress - currentScrollProgress) * 0.08;

    const sectionIndex = Math.min(Math.floor(currentScrollProgress), lastSectionIndex - 1);
    const sectionProgress = currentScrollProgress - sectionIndex;

    const targetShift = interpolate(
        shiftPositions[sectionIndex],
        shiftPositions[sectionIndex + 1] ?? shiftPositions[sectionIndex],
        sectionProgress
    );

    const targetOrbit = cameraOrbits[sectionIndex].map((val, i) =>
        interpolate(
            val,
            cameraOrbits[sectionIndex + 1]?.[i] ?? val,
            sectionProgress
        )
    );

    // Mouse coordinates smoothing
    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    // Apply look-at-cursor tilt effects (scaled down during fast scroll)
    const velocityFactor = Math.max(0.1, 1 - Math.abs(targetScrollProgress - currentScrollProgress) * 5);
    const parallaxX = mouseX * 25 * velocityFactor;
    const parallaxY = mouseY * 15 * velocityFactor;

    // Smooth transition updates
    currentTranslateX += (targetShift - currentTranslateX) * 0.08;
    currentOrbitX += (targetOrbit[0] + parallaxX - currentOrbitX) * 0.08;
    currentOrbitY += (targetOrbit[1] + parallaxY - currentOrbitY) * 0.08;

    beeModel.style.transform = `translateX(${currentTranslateX}%)`;
    beeModel.setAttribute(
        "camera-orbit",
        `${currentOrbitX}deg ${currentOrbitY}deg`
    );

    requestAnimationFrame(updateModel);
};

// Start the 3D loop
requestAnimationFrame(updateModel);

// Scroll Reveal Observer
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));

// Active Nav link tracking — throttled via rAF flag to avoid blocking scroll
const navLinks = document.querySelectorAll('.nav-link');
let navRafPending = false;
const updateActiveNav = () => {
    if (navRafPending) return;
    navRafPending = true;
    requestAnimationFrame(() => {
        navRafPending = false;
        const scrollPosition = window.scrollY + 100;
        sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => link.classList.remove('active'));
                if (navLinks[index]) navLinks[index].classList.add('active');
            }
        });
    });
};

window.addEventListener('scroll', updateActiveNav, { passive: true });

// Smooth scrolling nav clicks (integrated with Lenis if available)
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
            if (lenis) {
                lenis.scrollTo(targetSection);
            } else {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Contact Form submission
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        submitBtn.innerHTML = `
            <span>Sending...</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
                <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/>
            </svg>
        `;
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.innerHTML = `
                <span>Message Sent!</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            `;

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                contactForm.reset();
            }, 2000);
        }, 1500);
    });
}

// Dynamic Header background — merged into scroll listener (passive, low cost)
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    header.style.background = window.scrollY > 100
        ? 'rgba(15, 15, 15, 0.98)'
        : 'rgba(15, 15, 15, 0.92)';
}, { passive: true });

// Update offsets on resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        sections.forEach((section, index) => {
            sectionOffsets[index] = section.offsetTop;
        });
    }, 250);
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                el.classList.add('in-view');
            }
        });
    }, 100);
});

// --- Floating Pollen Particles Canvas ---
const canvas = document.getElementById('particles-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = 45;

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height + height;
            this.size = Math.random() * 1.5 + 0.8;
            this.speedY = -(Math.random() * 0.8 + 0.3);
            this.speedX = Math.random() * 0.6 - 0.3;
            this.alpha = Math.random() * 0.4 + 0.15;
            this.color = `rgba(212, 168, 83, ${this.alpha})`;
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            this.x += Math.sin(this.y * 0.008) * 0.15;

            // Mouse repulsion — use squared distance to avoid costly Math.sqrt
            const mouseAbsX = (targetMouseX + 0.5) * width;
            const mouseAbsY = (targetMouseY + 0.5) * height;
            const dx = this.x - mouseAbsX;
            const dy = this.y - mouseAbsY;
            const distSq = dx * dx + dy * dy;
            if (distSq < 10000) { // 100^2
                const dist = Math.sqrt(distSq);
                const force = (100 - dist) / 100;
                this.x += (dx / dist) * force * 2;
                this.y += (dy / dist) * force * 2;
            }

            if (this.y < -10 || this.x < -10 || this.x > width + 10) {
                this.reset();
                this.y = height + 10;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        const p = new Particle();
        p.y = Math.random() * height;
        particles.push(p);
    }

    const animateParticles = () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animateParticles);
    };
    animateParticles();
}

// --- Ambient Nature & Bee Synthesizer (Web Audio API) ---
let audioCtx = null;
let mainGain = null;
const audioToggle = document.getElementById('audio-toggle');

const initAudio = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(0, audioCtx.currentTime);
    mainGain.connect(audioCtx.destination);

    // 1. Synthesize Pink Noise for Wind/Nature breeze
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.08; 
        b6 = white * 0.115926;
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, audioCtx.currentTime);

    noiseSource.connect(filter);
    filter.connect(mainGain);
    noiseSource.start();

    // Modulate wind filter
    const windModulator = () => {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        const targetFreq = 180 + Math.random() * 250;
        filter.frequency.exponentialRampToValueAtTime(targetFreq, audioCtx.currentTime + 3 + Math.random() * 3);
        setTimeout(windModulator, 4000 + Math.random() * 3000);
    };
    windModulator();

    // 2. Synthesize Bee Hum (Triangle/Saw Oscillators)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const beeGain = audioCtx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, audioCtx.currentTime); 
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110.5, audioCtx.currentTime); 

    // Wing flutter (vibrato)
    const vibrato = audioCtx.createOscillator();
    const vibratoGain = audioCtx.createGain();
    vibrato.frequency.setValueAtTime(10, audioCtx.currentTime); 
    vibratoGain.gain.setValueAtTime(3.5, audioCtx.currentTime);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc1.frequency);
    vibratoGain.connect(osc2.frequency);

    const beeFilter = audioCtx.createBiquadFilter();
    beeFilter.type = 'bandpass';
    beeFilter.frequency.setValueAtTime(220, audioCtx.currentTime);
    beeFilter.Q.setValueAtTime(1.8, audioCtx.currentTime);

    osc1.connect(beeGain);
    osc2.connect(beeGain);
    beeGain.connect(beeFilter);
    beeFilter.connect(mainGain);

    beeGain.gain.setValueAtTime(0.06, audioCtx.currentTime);

    osc1.start();
    osc2.start();
    vibrato.start();
};

if (audioToggle) {
    audioToggle.addEventListener('click', () => {
        if (!audioCtx) {
            initAudio();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (audioToggle.classList.contains('playing')) {
            mainGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            setTimeout(() => {
                if (!audioToggle.classList.contains('playing')) {
                    audioCtx.suspend();
                }
            }, 800);
            audioToggle.classList.remove('playing');
            audioToggle.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        } else {
            audioCtx.resume();
            mainGain.gain.cancelScheduledValues(audioCtx.currentTime);
            mainGain.gain.setValueAtTime(mainGain.gain.value, audioCtx.currentTime);
            mainGain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 1.0);
            audioToggle.classList.add('playing');
            audioToggle.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        }
    });
}
