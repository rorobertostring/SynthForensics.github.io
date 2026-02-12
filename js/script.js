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
const copyBtn = document.querySelector('.copy-btn');
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
    initCharts();
});

function initCharts() {
    const c = getChartColors();

    // ═══════════════════════════════════════════
    // 1. Generator Distribution (Doughnut)
    // ═══════════════════════════════════════════
    const ctxGen = document.getElementById('generatorChart')?.getContext('2d');
    if (ctxGen) {
        charts.generator = new Chart(ctxGen, {
            type: 'doughnut',
            data: {
                labels: [
                    'Wan2.1 (14B)',
                    'CogVideoX (5B)',
                    'SkyReels-V2 (14B)',
                    'Self-Forcing (1.3B)',
                    'MAGI-1 (24B)'
                ],
                datasets: [{
                    data: [1363, 1363, 1363, 1363, 1363],
                    backgroundColor: [
                        palette.blue,
                        palette.lightBlue,
                        palette.red,
                        palette.redLight,
                        palette.cyan
                    ],
                    borderWidth: 2,
                    borderColor: c.tooltipBg,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: c.textColor, padding: 12, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${ctx.parsed} videos (20%)`
                        }
                    }
                }
            }
        });
    }

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
