// Theme Toggle Logic
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

const savedTheme = localStorage.getItem('theme') || 'light-mode';
body.classList.add(savedTheme);

themeToggle.addEventListener('click', () => {
    if (body.classList.contains('light-mode')) {
        body.classList.replace('light-mode', 'dark-mode');
        localStorage.setItem('theme', 'dark-mode');
    } else {
        body.classList.replace('dark-mode', 'light-mode');
        localStorage.setItem('theme', 'light-mode');
    }
    updateChartColors();
});

// Hero Scroll Buttons — smooth scroll to target section
document.querySelectorAll('.hero-scroll-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.getAttribute('href')?.replace('#', '');
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Scroll Transition Logic (Hero to Sidebar)
const header = document.getElementById('dynamic-header');
const scrollThreshold = 300;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    if (scrollY > scrollThreshold) {
        if (!body.classList.contains('scrolled')) {
            body.classList.add('scrolled');
            body.classList.remove('init-page');
        }
    } else {
        if (body.classList.contains('scrolled')) {
            body.classList.remove('scrolled');
            body.classList.add('init-page');
        }
    }

    // Sidebar Active Link Highlight
    const sections = document.querySelectorAll('section');
    sections.forEach(current => {
        const sectionHeight = current.offsetHeight;
        const sectionTop = current.offsetTop - 150;
        const sectionId = current.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            document.querySelector('.navigation a[href*=' + sectionId + ']')?.classList.add('active');
        } else {
            document.querySelector('.navigation a[href*=' + sectionId + ']')?.classList.remove('active');
        }
    });
});

// Scroll Reveal Animation
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.15 });

revealElements.forEach(el => revealObserver.observe(el));

// Copy BibTeX
const copyBtn = document.querySelector('#citation .copy-btn');
const citationText = document.querySelector('.citation-container code');

if (copyBtn) {
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(citationText.innerText)
            .then(() => {
                const originalText = copyBtn.innerText;
                copyBtn.innerText = 'Copied!';
                setTimeout(() => copyBtn.innerText = originalText, 2000);
            });
    });
}

// Copy Metadata JSON (Dataset Section)
function copyMetadata() {
    const metadataEl = document.getElementById('metadata-example');
    const btn = document.querySelector('#dataset .copy-btn');
    if (!metadataEl || !btn) return;
    navigator.clipboard.writeText(metadataEl.innerText)
        .then(() => {
            const original = btn.innerText;
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = original, 2000);
        });
}

// ────── Chart Utilities ──────

function getChartColors() {
    const isDark = body.classList.contains('dark-mode');
    return {
        textColor: isDark ? '#f5f5f7' : '#1d1d1f',
        gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        tooltipBg: isDark ? '#1c1c1e' : '#ffffff',
    };
}

const palette = {
    // Blue spectrum
    blue: '#1a5fb4',
    lightBlue: '#3584e4',
    cyan: '#62a0ea',
    navy: '#1055a3',
    sky: '#99c1f1',
    // Red spectrum
    red: '#c01c28',
    redLight: '#e01b24',
    redBright: '#ff7b63',
    redMuted: '#a51d2d',
    // Supporting colors
    orange: '#f48c06',
    green: '#2d6a4f',
    teal: '#0d9488',
};

let charts = {};

// ────── Init ──────

document.addEventListener('DOMContentLoaded', () => {
    Chart.defaults.font.family = "'Inter', sans-serif";
    initChartsLazy();
});

// Shared animation config for all bar charts — bars grow from bottom up
const CHART_ANIMATION = {
    duration: 1400,
    easing: 'easeOutQuart',
    // Each dataset's bars grow individually with a small stagger
    delay: (ctx) => ctx.dataIndex * 35 + ctx.datasetIndex * 120,
};

function initCharts() {
    const c = getChartColors();

    // Generator Distribution chart removed — data now shown in key-stats grid

    // ═══════════════════════════════════════════
    // 2. Zero-Shot Performance — VERTICAL grouped bar
    //    Data from README: Legacy (FF++, DFD, CDF) vs SF (FF++, DFD, CDF)
    //    Added: Performance Gap data (vs. FF++ and Mean)
    // ═══════════════════════════════════════════
    const ctxZero = document.getElementById('zeroShotChart')?.getContext('2d');
    if (ctxZero) {
        const detectors = ['CFM*', 'RECCE*', 'ProDet*', 'UCF*', 'Effort*', 'AltFreezing', 'FTCN', 'GenConViT', 'DFD-FCG'];
        const ffLegacy = [99.56, 96.21, 95.21, 98.61, 96.73, 98.60, 99.70, 99.60, 99.57];
        const sfFFpp = [81.76, 40.21, 62.20, 73.16, 77.82, 54.90, 50.61, 87.18, 93.26];
        const sfDFD = [77.69, 44.81, 49.22, 88.17, 77.05, 75.73, 62.78, 95.24, 84.34];
        const sfCDF = [70.52, 48.00, 65.31, 74.74, 55.10, 49.83, 58.74, 76.71, 85.11];
        // Performance Gap columns from README
        const gapVsFF = [-17.80, -56.00, -33.01, -25.45, -18.91, -43.70, -49.09, -12.42, -6.31];
        const gapMean = [-18.15, -50.74, -31.02, -13.15, -26.29, -35.38, -36.29, -12.84, -6.41];

        charts.zeroShot = new Chart(ctxZero, {
            type: 'bar',
            data: {
                labels: detectors,
                datasets: [
                    { label: 'FF++ (Legacy)', data: ffLegacy, backgroundColor: palette.blue, borderRadius: 4 },
                    { label: 'SF-FF++', data: sfFFpp, backgroundColor: palette.red, borderRadius: 4 },
                    { label: 'SF-DFD', data: sfDFD, backgroundColor: palette.redLight, borderRadius: 4 },
                    { label: 'SF-CDF', data: sfCDF, backgroundColor: palette.lightBlue, borderRadius: 4 },
                ]
            },
            options: {
                animation: CHART_ANIMATION,
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        min: 30, max: 100,
                        title: { display: true, text: 'AUC (%)', color: c.textColor },
                        grid: { color: c.gridColor },
                        ticks: { color: c.textColor }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: c.textColor, font: { weight: '600', size: 11 }, maxRotation: 45, minRotation: 0 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: c.textColor, usePointStyle: true, pointStyleWidth: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: (ctx) => {
                                const idx = ctx[0].dataIndex;
                                return [
                                    `Performance Gap vs FF++: ${gapVsFF[idx]}%`,
                                    `Mean Performance Gap: ${gapMean[idx]}%`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // ═══════════════════════════════════════════
    // 3. Fine-Tuning Results — VERTICAL grouped bar
    //    All 8 detectors from the updated README table
    // ═══════════════════════════════════════════
    const ctxFT = document.getElementById('fineTuningChart')?.getContext('2d');
    if (ctxFT) {
        const ftDetectors = ['RECCE*', 'ProDet*', 'UCF*', 'Effort*', 'AltFreezing', 'FTCN', 'GenConViT', 'DFD-FCG'];
        const zeroShot = [40.21, 62.20, 73.16, 77.82, 54.90, 50.61, 87.18, 93.26];
        const fineTuned = [98.42, 98.88, 80.31, 99.31, 99.11, 97.54, 99.76, 99.03];
        const backward = [56.91, 56.77, 54.45, 68.16, 64.62, 55.69, 96.31, 92.47];

        charts.fineTuning = new Chart(ctxFT, {
            type: 'bar',
            data: {
                labels: ftDetectors,
                datasets: [
                    { label: 'Zero-Shot', data: zeroShot, backgroundColor: palette.red, borderRadius: 4 },
                    { label: 'Fine-Tuned', data: fineTuned, backgroundColor: palette.blue, borderRadius: 4 },
                    { label: 'Backward (FF++)', data: backward, backgroundColor: palette.lightBlue, borderRadius: 4 },
                ]
            },
            options: {
                animation: CHART_ANIMATION,
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        min: 30, max: 100,
                        title: { display: true, text: 'AUC (%)', color: c.textColor },
                        grid: { color: c.gridColor },
                        ticks: { color: c.textColor }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: c.textColor, font: { weight: '600', size: 11 }, maxRotation: 45, minRotation: 0 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: c.textColor, usePointStyle: true, pointStyleWidth: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: (ctx) => {
                                const idx = ctx[0].dataIndex;
                                const gain = (fineTuned[idx] - zeroShot[idx]).toFixed(2);
                                return `Gain: +${gain}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ═══════════════════════════════════════════
    // 4. Generalization to Unseen Generators — VERTICAL grouped bar
    //    All 8 detectors from the updated README table
    // ═══════════════════════════════════════════
    const ctxGlz = document.getElementById('generalizationChart')?.getContext('2d');
    if (ctxGlz) {
        const glzDetectors = ['RECCE*', 'ProDet*', 'UCF*', 'Effort*', 'AltFreezing', 'FTCN', 'GenConViT', 'DFD-FCG'];
        const inDomain = [99.18, 96.83, 98.60, 98.91, 98.72, 95.55, 96.01, 86.06];
        const outDomain = [97.64, 93.57, 96.55, 96.07, 98.08, 97.40, 88.34, 82.79];
        const legacy = [56.67, 53.22, 57.84, 61.89, 60.69, 55.82, 52.10, 50.63];

        charts.generalization = new Chart(ctxGlz, {
            type: 'bar',
            data: {
                labels: glzDetectors,
                datasets: [
                    { label: 'In-Domain', data: inDomain, backgroundColor: palette.blue, borderRadius: 4 },
                    { label: 'Out-of-Domain', data: outDomain, backgroundColor: palette.lightBlue, borderRadius: 4 },
                    { label: 'Legacy Benchmarks', data: legacy, backgroundColor: palette.red, borderRadius: 4 },
                ]
            },
            options: {
                animation: CHART_ANIMATION,
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        min: 40, max: 100,
                        title: { display: true, text: 'AUC (%)', color: c.textColor },
                        grid: { color: c.gridColor },
                        ticks: { color: c.textColor }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: c.textColor, font: { weight: '600', size: 11 }, maxRotation: 45, minRotation: 0 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: c.textColor, usePointStyle: true, pointStyleWidth: 10 }
                    }
                }
            }
        });
    }
}

// ── Lazy chart initialization — create each chart on scroll ──
function initChartsLazy() {
    // Chart IDs → factory function names
    const chartDefs = [
        { canvasId: 'zeroShotChart', initFn: initZeroShotChart },
        { canvasId: 'fineTuningChart', initFn: initFineTuningChart },
        { canvasId: 'generalizationChart', initFn: initGeneralizationChart },
    ];

    chartDefs.forEach(({ canvasId, initFn }) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        // Use the chart card container as the trigger element (better viewport coverage)
        const container = canvas.closest('.chart-full') || canvas;

        observeOnceChart(container, () => {
            initFn();
        });
    });
}

// Dedicated observer for charts — lower threshold so they start before fully visible
function observeOnceChart(element, callback) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                callback();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    observer.observe(element);
}

function initZeroShotChart() {
    const ctxZero = document.getElementById('zeroShotChart')?.getContext('2d');
    if (!ctxZero || charts.zeroShot) return;
    const c = getChartColors();
    const detectors = ['CFM*', 'RECCE*', 'ProDet*', 'UCF*', 'Effort*', 'AltFreezing', 'FTCN', 'GenConViT', 'DFD-FCG'];
    const ffLegacy = [99.56, 96.21, 95.21, 98.61, 96.73, 98.60, 99.70, 99.60, 99.57];
    const sfFFpp = [81.76, 40.21, 62.20, 73.16, 77.82, 54.90, 50.61, 87.18, 93.26];
    const sfDFD = [77.69, 44.81, 49.22, 88.17, 77.05, 75.73, 62.78, 95.24, 84.34];
    const sfCDF = [70.52, 48.00, 65.31, 74.74, 55.10, 49.83, 58.74, 76.71, 85.11];
    const gapVsFF = [-17.80, -56.00, -33.01, -25.45, -18.91, -43.70, -49.09, -12.42, -6.31];
    const gapMean = [-18.15, -50.74, -31.02, -13.15, -26.29, -35.38, -36.29, -12.84, -6.41];
    charts.zeroShot = new Chart(ctxZero, {
        type: 'bar',
        data: {
            labels: detectors, datasets: [
                { label: 'FF++ (Legacy)', data: ffLegacy, backgroundColor: palette.blue, borderRadius: 4 },
                { label: 'SF-FF++', data: sfFFpp, backgroundColor: palette.red, borderRadius: 4 },
                { label: 'SF-DFD', data: sfDFD, backgroundColor: palette.redLight, borderRadius: 4 },
                { label: 'SF-CDF', data: sfCDF, backgroundColor: palette.lightBlue, borderRadius: 4 },
            ]
        },
        options: {
            animation: CHART_ANIMATION,
            responsive: true, maintainAspectRatio: true,
            scales: {
                y: { min: 30, max: 100, title: { display: true, text: 'AUC (%)', color: c.textColor }, grid: { color: c.gridColor }, ticks: { color: c.textColor } },
                x: { grid: { display: false }, ticks: { color: c.textColor, font: { weight: '600', size: 11 }, maxRotation: 45, minRotation: 0 } }
            },
            plugins: {
                legend: { position: 'top', labels: { color: c.textColor, usePointStyle: true, pointStyleWidth: 10 } },
                tooltip: {
                    callbacks: {
                        afterBody: (ctx) => {
                            const i = ctx[0].dataIndex;
                            return [`Gap vs FF++: ${gapVsFF[i]}%`, `Mean Gap: ${gapMean[i]}%`];
                        }
                    }
                }
            }
        }
    });
}

function initFineTuningChart() {
    const ctxFT = document.getElementById('fineTuningChart')?.getContext('2d');
    if (!ctxFT || charts.fineTuning) return;
    const c = getChartColors();
    const ftDetectors = ['RECCE*', 'ProDet*', 'UCF*', 'Effort*', 'AltFreezing', 'FTCN', 'GenConViT', 'DFD-FCG'];
    const zeroShot = [40.21, 62.20, 73.16, 77.82, 54.90, 50.61, 87.18, 93.26];
    const fineTuned = [98.42, 98.88, 80.31, 99.31, 99.11, 97.54, 99.76, 99.03];
    const backward = [56.91, 56.77, 54.45, 68.16, 64.62, 55.69, 96.31, 92.47];
    charts.fineTuning = new Chart(ctxFT, {
        type: 'bar',
        data: {
            labels: ftDetectors, datasets: [
                { label: 'Zero-Shot', data: zeroShot, backgroundColor: palette.red, borderRadius: 4 },
                { label: 'Fine-Tuned', data: fineTuned, backgroundColor: palette.blue, borderRadius: 4 },
                { label: 'Backward (FF++)', data: backward, backgroundColor: palette.lightBlue, borderRadius: 4 },
            ]
        },
        options: {
            animation: CHART_ANIMATION,
            responsive: true, maintainAspectRatio: true,
            scales: {
                y: { min: 30, max: 100, title: { display: true, text: 'AUC (%)', color: c.textColor }, grid: { color: c.gridColor }, ticks: { color: c.textColor } },
                x: { grid: { display: false }, ticks: { color: c.textColor, font: { weight: '600', size: 11 }, maxRotation: 45, minRotation: 0 } }
            },
            plugins: {
                legend: { position: 'top', labels: { color: c.textColor, usePointStyle: true, pointStyleWidth: 10 } },
                tooltip: {
                    callbacks: {
                        afterBody: (ctx) => {
                            const i = ctx[0].dataIndex;
                            return `Gain: +${(fineTuned[i] - zeroShot[i]).toFixed(2)}%`;
                        }
                    }
                }
            }
        }
    });
}

function initGeneralizationChart() {
    const ctxGlz = document.getElementById('generalizationChart')?.getContext('2d');
    if (!ctxGlz || charts.generalization) return;
    const c = getChartColors();
    const glzDetectors = ['RECCE*', 'ProDet*', 'UCF*', 'Effort*', 'AltFreezing', 'FTCN', 'GenConViT', 'DFD-FCG'];
    const inDomain = [99.18, 96.83, 98.60, 98.91, 98.72, 95.55, 96.01, 86.06];
    const outDomain = [97.64, 93.57, 96.55, 96.07, 98.08, 97.40, 88.34, 82.79];
    const legacy = [56.67, 53.22, 57.84, 61.89, 60.69, 55.82, 52.10, 50.63];
    charts.generalization = new Chart(ctxGlz, {
        type: 'bar',
        data: {
            labels: glzDetectors, datasets: [
                { label: 'In-Domain', data: inDomain, backgroundColor: palette.blue, borderRadius: 4 },
                { label: 'Out-of-Domain', data: outDomain, backgroundColor: palette.lightBlue, borderRadius: 4 },
                { label: 'Legacy Benchmarks', data: legacy, backgroundColor: palette.red, borderRadius: 4 },
            ]
        },
        options: {
            animation: CHART_ANIMATION,
            responsive: true, maintainAspectRatio: true,
            scales: {
                y: { min: 40, max: 100, title: { display: true, text: 'AUC (%)', color: c.textColor }, grid: { color: c.gridColor }, ticks: { color: c.textColor } },
                x: { grid: { display: false }, ticks: { color: c.textColor, font: { weight: '600', size: 11 }, maxRotation: 45, minRotation: 0 } }
            },
            plugins: {
                legend: { position: 'top', labels: { color: c.textColor, usePointStyle: true, pointStyleWidth: 10 } }
            }
        }
    });
}

// ────── Theme-aware chart updates ──────

function updateChartColors() {
    const c = getChartColors();

    Object.values(charts).forEach(chart => {
        if (!chart) return;

        if (chart.options.plugins?.legend?.labels) {
            chart.options.plugins.legend.labels.color = c.textColor;
        }

        if (chart.options.scales) {
            Object.values(chart.options.scales).forEach(scale => {
                if (scale.ticks) scale.ticks.color = c.textColor;
                if (scale.grid) scale.grid.color = c.gridColor;
                if (scale.title) scale.title.color = c.textColor;
            });
        }

        if (chart.config.type === 'doughnut') {
            chart.data.datasets[0].borderColor = c.tooltipBg;
        }

        chart.update('none');
    });
}

// ════════════════════════════════════════════════════════
// ANIMATION CONTROLLERS
// ════════════════════════════════════════════════════════

// ── Helper: observe once and fire callback ──────────────
function observeOnce(element, callback, options = {}) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                callback(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.25, ...options });
    observer.observe(element);
}

// ── 1. TYPEWRITER — Abstract Paragraph ─────────────────
(function initTypewriter() {
    const abstractParagraph = document.querySelector('#abstract .abstract-content > p');
    if (!abstractParagraph) return;

    const fullText = abstractParagraph.innerText.trim();
    const CHAR_DELAY_MS = 2; // very fast: ~2ms per character

    // Empty the paragraph and mark it as typewriter target
    abstractParagraph.textContent = '';
    abstractParagraph.classList.add('typewriter-target');

    // Create cursor element
    const cursor = document.createElement('span');
    cursor.classList.add('typewriter-cursor');
    abstractParagraph.appendChild(cursor);

    let started = false;

    function startTypewriter() {
        if (started) return;
        started = true;

        let charIndex = 0;

        function typeNextChar() {
            if (charIndex < fullText.length) {
                // Insert text node before cursor
                const textNode = document.createTextNode(fullText.charAt(charIndex));
                abstractParagraph.insertBefore(textNode, cursor);
                charIndex++;
                setTimeout(typeNextChar, CHAR_DELAY_MS);
            } else {
                // Done — fade out cursor after a short pause
                setTimeout(() => {
                    cursor.style.transition = 'opacity 0.6s ease';
                    cursor.style.opacity = '0';
                    setTimeout(() => cursor.remove(), 700);
                    // Then trigger highlight list
                    revealHighlightsList();
                }, 600);
            }
        }

        typeNextChar();
    }

    observeOnce(abstractParagraph, startTypewriter, { threshold: 0.1 });
})();

// ── 2. ABSTRACT HIGHLIGHTS — Staggered slide-in ─────────
function revealHighlightsList() {
    const items = document.querySelectorAll('#abstract .highlights-list li');
    items.forEach((item, idx) => {
        setTimeout(() => {
            item.classList.add('highlight-visible');
        }, idx * 120);
    });
}

// ── 3. PIPELINE — Image wipe + stage-by-stage reveal ────
(function initPipelineAnimation() {
    const pipelineSection = document.getElementById('pipeline');
    if (!pipelineSection) return;

    // Wrap each h3+p pair in a .pipeline-stage div
    const narrative = pipelineSection.querySelector('.pipeline-narrative');
    if (!narrative) return;

    const children = Array.from(narrative.children);
    let currentStageEl = null;
    const stages = [];

    children.forEach(child => {
        if (child.tagName === 'H3') {
            currentStageEl = document.createElement('div');
            currentStageEl.classList.add('pipeline-stage');
            child.parentNode.insertBefore(currentStageEl, child);
            currentStageEl.appendChild(child);
            stages.push(currentStageEl);
        } else if (child.tagName === 'P' && currentStageEl) {
            currentStageEl.appendChild(child);
        } else {
            // intro paragraph or other elements — wrap in own stage
            if (child.classList && !child.classList.contains('pipeline-stage')) {
                const introStage = document.createElement('div');
                introStage.classList.add('pipeline-stage');
                child.parentNode.insertBefore(introStage, child);
                introStage.appendChild(child);
                stages.push(introStage);
            }
        }
    });

    // Observe the pipeline section; on enter, reveal in sequence
    observeOnce(pipelineSection, () => {
        // First: wipe-reveal the pipeline image
        const pipelineImg = pipelineSection.querySelector('.pipeline-image');
        if (pipelineImg) {
            requestAnimationFrame(() => pipelineImg.classList.add('image-revealed'));
        }

        // Then: reveal narrative stages one by one with delay
        stages.forEach((stage, idx) => {
            setTimeout(() => {
                stage.classList.add('stage-visible');
            }, 300 + idx * 280);
        });
    }, { threshold: 0.05 });
})();

// ── 4. STAT COUNTERS — Animated count-up ────────────────
(function initStatCounters() {
    const statNumbers = document.querySelectorAll('.stat-number');
    if (!statNumbers.length) return;

    function parseStatValue(text) {
        // Extract the primary numeric part (ignore ~, text suffixes, ranges)
        const cleaned = text.replace(/[~,]/g, '');
        const match = cleaned.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : null;
    }

    function animateCounter(el, targetValue, suffix, prefix, duration = 1200) {
        const startTime = performance.now();
        const originalText = el.dataset.originalText;

        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        }

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const currentValue = Math.floor(easedProgress * targetValue);

            // Format number with locale separator
            const formatted = currentValue.toLocaleString('en-US');
            el.textContent = prefix + formatted + suffix;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                // Restore original text exactly as authored
                el.textContent = originalText;
                el.classList.add('counting-done');
            }
        }

        requestAnimationFrame(step);
    }

    statNumbers.forEach(el => {
        // Save original text for accurate restoration
        el.dataset.originalText = el.textContent.trim();
        const rawText = el.textContent.trim();
        const numericValue = parseStatValue(rawText);

        // Determine if this value is "countable":
        // must be a pure numeric value (or with ~ prefix and simple suffix), not a range or compound format
        const isCountable = (
            numericValue !== null &&
            numericValue >= 1 &&
            !rawText.match(/[×–—]/)   // exclude ranges (8–24) and compound formats (480×832)
        );

        if (isCountable) {
            const hasPrefix = rawText.startsWith('~') ? '~' : '';
            // Detect suffix (non-numeric trailing chars after the last digit group)
            const suffixMatch = rawText.replace(/^~/, '').match(/^[\d,.]+(.*)$/);
            const suffix = suffixMatch ? suffixMatch[1] : '';

            observeOnce(el, () => {
                animateCounter(el, numericValue, suffix, hasPrefix);
            }, { threshold: 0.8 });
        } else {
            // Non-countable (range, compound format): pop highlight after reveal-scale completes
            observeOnce(el, () => {
                // Delay to let the parent reveal-scale animation finish first (~800ms)
                setTimeout(() => {
                    el.classList.add('counting-done');
                }, 900);
            }, { threshold: 0.3 });
        }
    });
})();

// ── 5a. MODEL CARDS — Staggered cascade ─────────────────
(function initModelCardsCascade() {
    const modelCards = document.querySelectorAll('.models-grid .model-card');
    if (!modelCards.length) return;

    const grid = document.querySelector('.models-grid');
    if (!grid) return;

    observeOnce(grid, () => {
        modelCards.forEach((card, idx) => {
            setTimeout(() => {
                card.classList.add('card-visible');
            }, idx * 110);
        });
    }, { threshold: 0.15 });
})();

// ── 5b. DOWNLOAD PLACEHOLDER CARDS — Staggered ──────────
(function initDownloadCardsCascade() {
    const downloadCards = document.querySelectorAll('.download-placeholder-card');
    if (!downloadCards.length) return;

    const grid = document.querySelector('.download-placeholder-grid');
    if (!grid) return;

    observeOnce(grid, () => {
        downloadCards.forEach((card, idx) => {
            setTimeout(() => {
                card.classList.add('card-visible');
            }, idx * 150);
        });
    }, { threshold: 0.2 });
})();

// ── 6. ENHANCED REVEAL VARIANTS ─────────────────────────
(function initEnhancedReveals() {
    const variantSelectors = '.reveal-left, .reveal-right, .reveal-scale';
    const variantElements = document.querySelectorAll(variantSelectors);
    if (!variantElements.length) return;

    const variantObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                variantObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    variantElements.forEach(el => variantObserver.observe(el));
})();
