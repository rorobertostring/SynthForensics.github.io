/* SynthForensics — NeurIPS 2026 project page */
(() => {
    'use strict';

    const root = document.documentElement;
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasGSAP = !!(window.gsap && window.ScrollTrigger);
    const SIDEBAR = 280;
    const isDesktop = () => innerWidth >= 1024;
    const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();
    const touchOnly = matchMedia('(hover: none)').matches;

    // Phones resize the viewport whenever the address bar slides in or out during a scroll. Re-measuring
    // the layout and the scroll animations on those height-only changes made them jump mid-scroll, so the
    // layout code listens to 'sf:resize', which only fires for real resizes (width, rotation, big changes).
    let vpW = innerWidth, vpH = innerHeight;
    addEventListener('load', () => { vpW = innerWidth; vpH = innerHeight; });   // the settled viewport
    addEventListener('resize', () => {
        if (touchOnly && innerWidth === vpW && Math.abs(innerHeight - vpH) < 160) return;
        vpW = innerWidth;
        vpH = innerHeight;
        dispatchEvent(new Event('sf:resize'));
    });

    /* ------------------------------------------------------------------
       Video wall grid (10 x 5 tiles, matching the 4K mosaic)
       ------------------------------------------------------------------ */
    const COLS = 10, ROWS = 5;
    const TARGET = { r: 2, c: 5 };
    const wall = $('.wall');
    const grid = $('.wall-grid');
    const video = $('.wall-video');
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.innerHTML = '<span class="cover"></span><span class="cell-label">SYNTHETIC</span>';
            cell.dataset.r = r;
            cell.dataset.c = c;
            if (r === TARGET.r && c === TARGET.c) cell.classList.add('is-target');
            grid.appendChild(cell);
            cells.push(cell);
        }
    }
    const targetCell = cells[TARGET.r * COLS + TARGET.c];
    video.play?.().catch(() => { });

    /* ------------------------------------------------------------------
       Theme
       ------------------------------------------------------------------ */
    const themeBtn = $('.theme-toggle');
    themeBtn?.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = next;
        try { localStorage.setItem('sf-theme', next); } catch (e) { }
        $('meta[name="theme-color"]').setAttribute('content', next === 'light' ? '#ffffff' : '#0a0a0b');
        if (hasGSAP) requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    /* ------------------------------------------------------------------
       Mobile menu
       ------------------------------------------------------------------ */
    const menuBtn = $('.menu-btn');
    const mobileMenu = $('#mobile-menu');
    const setMenu = (open) => {
        if (!mobileMenu || mobileMenu.hidden === !open) return;
        menuBtn.setAttribute('aria-expanded', String(open));
        mobileMenu.hidden = !open;
        if (open) mobileMenu.scrollTop = 0;
        dispatchEvent(new CustomEvent('sf:menu', { detail: open }));
    };
    const closeMenu = () => setMenu(false);
    menuBtn?.addEventListener('click', () => setMenu(mobileMenu.hidden));
    // the menu only exists below the desktop breakpoint: close it if the screen grows past it
    addEventListener('sf:resize', () => { if (isDesktop()) closeMenu(); });

    /* ------------------------------------------------------------------
       Copy buttons
       ------------------------------------------------------------------ */
    $$('.copy').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const src = $(btn.dataset.copy);
            if (!src) return;
            try {
                await navigator.clipboard.writeText(src.textContent);
                btn.textContent = 'Copied';
                btn.classList.add('is-done');
                setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1600);
            } catch (e) { }
        });
    });

    /* ------------------------------------------------------------------
       Paired protocol: scale the fixed-size stage to its column
       ------------------------------------------------------------------ */
    const protocol = $('.protocol');
    const pStage = $('.p-stage');
    const pWrap = $('.p-stage-wrap');
    const STAGE_W = 640, STAGE_H = 540;
    // fit the stage to its column, and to the height left on screen (short landscape phones)
    function fitProtocolStage() {
        const grid = $('.protocol-grid'), pin = $('.protocol-pin');
        const twoCols = getComputedStyle(grid).gridTemplateColumns.split(' ').length > 1;
        const availH = twoCols
            ? innerHeight - 120
            : innerHeight - (pWrap.getBoundingClientRect().top - pin.getBoundingClientRect().top) - 20;
        const k = Math.min(1, pWrap.clientWidth / STAGE_W, Math.max(0.3, availH / STAGE_H));
        pStage.style.transform = `scale(${k})`;
        pWrap.style.height = STAGE_H * k + 'px';
    }
    fitProtocolStage();
    addEventListener('sf:resize', fitProtocolStage);
    addEventListener('load', fitProtocolStage);   // the first pass can run before layout settles

    /* ------------------------------------------------------------------
       Pipeline · validation: the "rewrite and check again" loop, drawn from
       under both checks back up into the caption card (layout coordinates,
       so the 3D scaling of the step does not matter)
       ------------------------------------------------------------------ */
    function drawValidLoop() {
        const v = $('.z-v-valid');
        const svg = v && $('.z-loop svg', v);
        if (!svg || getComputedStyle(svg).display === 'none') return;
        const doc = $('.z-doc', v), gates = $$('.z-gate', v);
        const W = v.offsetWidth, H = v.offsetHeight;
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const cx = (el) => el.offsetLeft + el.offsetWidth / 2;
        const bottom = (el) => el.offsetTop + el.offsetHeight;
        const [g1, g2] = gates;
        const x0 = cx(doc), lane = Math.max(bottom(doc), ...gates.map(bottom)) + 30, r = 14;
        // from the second check down, back along a lane under the row, then up into the caption
        $('.z-loop-main', svg).setAttribute('d', `M${cx(g2)},${bottom(g2)}V${lane - r}Q${cx(g2)},${lane} ${cx(g2) - r},${lane}` +
            `H${x0 + r}Q${x0},${lane} ${x0},${lane - r}V${bottom(doc) + 8}`);
        // the first check joins the same lane
        $('.z-loop-branch', svg).setAttribute('d', `M${cx(g1)},${bottom(g1)}V${lane}`);
        // a small red cross where each check can fail
        const xs = $('.z-loop-x', svg);
        xs.textContent = '';
        gates.forEach((g) => {
            const x = cx(g), y = bottom(g);
            svgEl('circle', { cx: x, cy: y, r: 9 }, xs);
            svgEl('path', { d: `M${x - 3.5},${y - 3.5}l7,7m0,-7l-7,7` }, xs);
        });
        const label = $('.z-loop-label', v);
        label.style.left = (x0 + cx(g2)) / 2 + 'px';
        label.style.top = lane + 10 + 'px';
    }

    /* ------------------------------------------------------------------
       Results chart
       ------------------------------------------------------------------ */
    const DATA = {
        zs: {
            rows: [['CFM*', 99.56, 73.54], ['RECCE*', 99.15, 79.50], ['ProDet*', 98.77, 75.35], ['UCF*', 99.50, 75.41],
            ['Effort*', 98.11, 70.31], ['LAA-Net*', 99.96, 69.42], ['GenD*', 98.97, 82.35], ['AltFreezing', 98.60, 56.12],
            ['FTCN', 99.70, 44.76], ['GenConViT', 99.60, 83.61], ['DFD-FCG', 99.57, 86.57], ['FakeSTormer', 99.90, 72.59]],
            extra: [['MM-Det', 49.17], ['NSG-VD', 58.95], ['D3', 48.85]],
            blue: 'AUC on FF++', red: 'Zero-shot AUC on SF-FF++', deltaHead: 'Gap',
            big: '−27', label: 'mean AUC points lost from FF++ to SF-FF++ across 12 face-based detectors (range 13 to 55).',
            body: 'Aggressive compression costs a further 23 points. The three AI-generated-video detectors score 48.85 to 58.95 on SF-FF++, close to chance.'
        },
        ft: {
            rows: [['RECCE*', 88.83, 98.04, 18.54], ['ProDet*', 84.15, 96.14, 20.79], ['UCF*', 92.55, 96.77, 21.36],
            ['Effort*', 92.36, 96.40, 26.09], ['GenD*', 98.23, 80.60, -1.75], ['AltFreezing', 65.52, 99.12, 43.00],
            ['FTCN', 57.07, 98.36, 53.60], ['GenConViT', 86.39, 97.56, 13.95], ['DFD-FCG', 99.37, 92.81, 6.24]],
            blue: 'Backward AUC on FF++ after fine-tuning', red: 'Fine-tuned AUC on SF-FF++', deltaHead: 'FT gain',
            big: '99.12', label: 'best fine-tuned AUC on SF-FF++ (AltFreezing).',
            body: 'Fine-tuning closes the gap at a cost: backward AUC on FF++ falls to 65.52 for AltFreezing and 57.07 for FTCN.'
        },
        sc: {
            rows: [['RECCE*', 65.25, 94.65], ['ProDet*', 54.57, 80.92], ['UCF*', 60.82, 94.33], ['Effort*', 62.97, 94.64],
            ['GenD*', 50.11, 55.47], ['AltFreezing', 63.08, 98.78], ['FTCN', 53.75, 97.74], ['GenConViT', 60.19, 87.58],
            ['DFD-FCG', 83.41, 90.19]],
            blue: 'Legacy transfer (FF++ / DFD / CDF mean)', red: 'Unseen SynthForensics generators', deltaHead: 'Legacy gap',
            big: '98.78', label: 'best AUC on unseen generators (AltFreezing), trained on SynthForensics only.',
            body: 'In-domain: CogVideoX, Wan2.1, LTX-2.3, MAGI-1. Held out: SkyReels-V2, Self-Forcing, Helios, daVinci-MagiHuman. Legacy transfer stays at 50 to 83 AUC.'
        }
    };
    const pct = (v) => ((v - 40) / 60) * 100;
    const fmt = (d) => (d > 0 ? '+' : d < 0 ? '−' : '') + Math.abs(d).toFixed(2);
    const rowsEl = $('.chart-rows');

    // Static gridlines + axis
    (function buildAxes() {
        const gl = document.createElement('div');
        gl.className = 'gridlines';
        const axis = $('.chart-axis');
        for (let v = 40; v <= 100; v += 10) {
            const i = document.createElement('i');
            i.style.left = pct(v) + '%';
            if (v === 50) i.className = 'chance';
            gl.appendChild(i);
            const s = document.createElement('span');
            s.style.left = pct(v) + '%';
            s.textContent = v;
            if (v === 50) {
                const em = document.createElement('em');
                em.textContent = ' · chance';
                s.appendChild(em);
            }
            axis.appendChild(s);
        }
        rowsEl.appendChild(gl);
    })();

    function renderChart(tab, animate) {
        const d = DATA[tab];
        $$('.row, .row-group', rowsEl).forEach((n) => n.remove());
        const frag = document.createDocumentFragment();
        const anim = [];
        d.rows.forEach(([name, blue, red, gain]) => {
            const delta = tab === 'ft' ? gain : tab === 'sc' ? blue - red : red - blue;
            const row = document.createElement('div');
            row.className = 'row';
            const lo = Math.min(blue, red), hi = Math.max(blue, red);
            row.innerHTML = `<span class="row-name">${name}</span>
                <span class="row-plot">
                  <span class="row-bar${red < blue ? ' rev' : ''}" style="left:${pct(lo)}%;width:${pct(hi) - pct(lo)}%"></span>
                  <span class="row-dot b" style="left:${pct(blue)}%" data-tip="${d.blue}: ${blue.toFixed(2)}"></span>
                  <span class="row-dot r" style="left:${pct(red)}%" data-tip="${d.red}: ${red.toFixed(2)}"></span>
                </span>
                <span class="row-delta">${fmt(delta)}</span>`;
            frag.appendChild(row);
            anim.push({ row, blue, red });
        });
        if (d.extra) {
            const g = document.createElement('div');
            g.className = 'row-group';
            g.textContent = 'AI-generated video detectors · no legacy results';
            frag.appendChild(g);
            d.extra.forEach(([name, red]) => {
                const row = document.createElement('div');
                row.className = 'row';
                row.innerHTML = `<span class="row-name">${name}</span>
                    <span class="row-plot"><span class="row-dot r" style="left:${pct(red)}%" data-tip="SF-FF++: ${red.toFixed(2)}"></span></span>
                    <span class="row-delta">—</span>`;
                frag.appendChild(row);
                anim.push({ row, blue: 50, red, solo: true });
            });
        }
        rowsEl.appendChild(frag);

        $('.lg-blue').textContent = d.blue;
        $('.lg-red').textContent = d.red;
        $('.delta-head').textContent = d.deltaHead;
        $('.tk-big').textContent = d.big;
        $('.tk-label').textContent = d.label;
        $('.tk-body').textContent = d.body;

        if (animate && hasGSAP && !reduceMotion) {
            anim.forEach(({ row, blue, red, solo }, i) => {
                const dot = row.querySelector('.row-dot.r');
                const bar = row.querySelector('.row-bar');
                const delay = 0.05 + i * 0.045;
                gsap.from(row, { opacity: 0, y: 10, duration: 0.5, delay, ease: 'power2.out' });
                if (solo) {
                    gsap.from(dot, { scale: 0, duration: 0.6, delay: delay + 0.2, ease: 'back.out(2)' });
                    return;
                }
                gsap.fromTo(dot, { left: pct(blue) + '%' }, { left: pct(red) + '%', duration: 1.1, delay: delay + 0.15, ease: 'expo.out' });
                gsap.fromTo(bar, { scaleX: 0 }, {
                    scaleX: 1, duration: 1.1, delay: delay + 0.15, ease: 'expo.out',
                    transformOrigin: red < blue ? 'right center' : 'left center'
                });
            });
            gsap.from('.tk-big, .tk-label, .tk-body', { opacity: 0, y: 12, stagger: 0.06, duration: 0.6, ease: 'power2.out' });
        }
    }

    const seg = $('.seg');
    const segPill = $('.seg-pill');
    function moveSegPill() {
        const active = $('button[aria-selected="true"]', seg);
        if (!active) return;
        segPill.style.width = active.offsetWidth + 'px';
        segPill.style.transform = `translateX(${active.offsetLeft}px)`;
    }
    let chartShown = false;
    $$('button', seg).forEach((b) => b.addEventListener('click', () => {
        $$('button', seg).forEach((x) => x.setAttribute('aria-selected', String(x === b)));
        moveSegPill();
        chartShown = true;
        renderChart(b.dataset.tab, true);
    }));
    renderChart('zs', false);
    requestAnimationFrame(moveSegPill);
    addEventListener('sf:resize', moveSegPill);

    /* ------------------------------------------------------------------
       Realism: face quality (bars) and landmark completeness (lines).
       Both are built in their final state; with GSAP the scroll position
       drives them (see "Realism charts" in the animated part below).
       ------------------------------------------------------------------ */
    // mean TOPIQ-NR-Face per benchmark, sorted; kind: sf | real | other
    const FACE_Q = [
        ['DFD (real)', 0.601, 'real'], ['LOKI', 0.505], ['SynthForensics', 0.471, 'sf'], ['GVD', 0.456],
        ['FF++ (real)', 0.442, 'real'], ['GenVidBench', 0.401], ['DeepAction', 0.401], ['AEGIS', 0.381],
        ['AIGVDBench', 0.371], ['GenVideo', 0.369], ['GVF', 0.333], ['DVF', 0.311]
    ];
    const FQ_MAX = 0.7, FQ_LO = 0.442, FQ_HI = 0.601;
    const fqEl = $('.fq');
    if (fqEl) {
        const x = (v) => (v / FQ_MAX) * 100;
        const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
        fqEl.innerHTML = `
            <div class="fq-plot">
                <div class="fq-guides" aria-hidden="true">
                    ${ticks.map((v) => `<i style="left:${x(v)}%"></i>`).join('')}
                    <span class="fq-band" style="left:${x(FQ_LO)}%;width:${x(FQ_HI) - x(FQ_LO)}%"><em>Real-video range</em></span>
                </div>
                ${FACE_Q.map(([name, v, kind = 'other']) => `
                <div class="fq-row is-${kind}">
                    <span class="fq-name">${name}</span>
                    <span class="fq-track"><i class="fq-bar" style="width:${x(v)}%"></i><b class="fq-val" style="left:${x(v)}%" data-v="${v}">${v.toFixed(3)}</b>${kind === 'sf' ? `<span class="fq-flag" style="left:${x(v)}%">inside the real range</span>` : ''}</span>
                </div>`).join('')}
            </div>
            <div class="fq-axis" aria-hidden="true">${ticks.map((v) => `<span style="left:${x(v)}%">${v.toFixed(1)}</span>`).join('')}</div>
            <p class="chart-caption">Mean TOPIQ-NR-Face score</p>`;
    }

    // landmark completeness per FAN peak-activation threshold (read off the paper figure, not shown as numbers)
    const LM_TAU = [0.3, 0.4, 0.5, 0.6, 0.7];
    const LANDMARKS = [
        ['AIGVDBench', 'other', [0.900, 0.880, 0.845, 0.761, 0.502]],
        ['GenVidBench', 'other', [0.870, 0.846, 0.803, 0.706, 0.424]],
        ['GenVideo', 'other', [0.818, 0.803, 0.775, 0.714, 0.510]],
        ['GVD', 'other', [0.814, 0.795, 0.764, 0.694, 0.477]],
        ['LOKI', 'other', [0.814, 0.786, 0.726, 0.607, 0.345]],
        ['DeepAction', 'other', [0.745, 0.705, 0.646, 0.538, 0.315]],
        ['DVF', 'other', [0.695, 0.670, 0.632, 0.558, 0.376]],
        ['GVF', 'other', [0.706, 0.665, 0.608, 0.485, 0.235]],
        ['AEGIS', 'other', [0.655, 0.622, 0.563, 0.449, 0.264]],
        ['DFD (real)', 'dfd', [0.983, 0.981, 0.976, 0.965, 0.893]],
        ['FF++ (real)', 'ff', [1.000, 0.999, 0.998, 0.994, 0.933]],
        ['SynthForensics', 'sf', [0.979, 0.977, 0.972, 0.961, 0.886]]
    ];
    const lmEl = $('.lm');
    let lmP = 1;                 // drawing progress, 0..1 (where the scanner is)
    let lmUpdate = () => {};
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const svgEl = (tag, attrs, parent) => {
        const n = document.createElementNS(SVG_NS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    };

    function renderLandmarks() {
        if (!lmEl) return;
        lmEl.textContent = '';
        const W = lmEl.clientWidth;
        const narrow = W < 520;
        const H = Math.round(narrow ? Math.max(270, W * 0.86) : Math.min(430, W * 0.68));
        const m = { t: 30, r: narrow ? 12 : 132, b: 52, l: 38 };
        const pw = W - m.l - m.r, ph = H - m.t - m.b;
        const N = LM_TAU.length - 1;
        const X = (t) => m.l + (t / N) * pw;              // t = fractional threshold index, 0..N
        const Y = (v) => m.t + ((1 - v) / 0.8) * ph;
        const at = (vals, t) => { const i = Math.min(N - 1, Math.floor(t)), f = t - i; return vals[i] + (vals[i + 1] - vals[i]) * f; };
        const pts = (vals) => vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('L');
        const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }, lmEl);

        const defs = svgEl('defs', {}, svg);
        const glow = svgEl('filter', { id: 'lm-glow', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
        svgEl('feGaussianBlur', { stdDeviation: 4, result: 'b' }, glow);
        const merge = svgEl('feMerge', {}, glow);
        svgEl('feMergeNode', { in: 'b' }, merge);
        svgEl('feMergeNode', { in: 'SourceGraphic' }, merge);
        const grad = svgEl('linearGradient', { id: 'lm-fill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        svgEl('stop', { offset: '0%', class: 'lm-fill-a' }, grad);
        svgEl('stop', { offset: '100%', class: 'lm-fill-b' }, grad);
        const clip = svgEl('rect', { x: 0, y: 0, width: W, height: H }, svgEl('clipPath', { id: 'lm-clip' }, defs));

        // grid, ticks, axis titles
        const grid = svgEl('g', { class: 'lm-grid' }, svg);
        [0.2, 0.4, 0.6, 0.8, 1].forEach((v) => {
            svgEl('line', { x1: m.l, x2: X(N), y1: Y(v), y2: Y(v) }, grid);
            svgEl('text', { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'lm-tick' }, svg).textContent = v.toFixed(1);
        });
        LM_TAU.forEach((tau, i) => {
            svgEl('text', { x: X(i), y: m.t + ph + 22, 'text-anchor': 'middle', class: 'lm-tick' }, svg).textContent = tau.toFixed(1);
        });
        svgEl('text', { x: m.l + pw / 2, y: H - 4, 'text-anchor': 'middle', class: 'lm-title' }, svg).textContent = 'FAN peak-activation threshold τ';
        svgEl('text', { x: m.l - 30, y: 12, class: 'lm-title' }, svg).textContent = 'Landmark completeness';

        // series, revealed up to the scanner; SynthForensics on top with a glow and a wash underneath
        const plot = svgEl('g', { 'clip-path': 'url(#lm-clip)' }, svg);
        const sfVals = LANDMARKS.find((d) => d[1] === 'sf')[2];
        svgEl('path', { d: `M${pts(sfVals)}L${X(N)},${Y(0.2)}L${X(0)},${Y(0.2)}Z`, class: 'lm-area' }, plot);
        const series = LANDMARKS.map(([, kind, vals]) => {
            const g = svgEl('g', { class: 'lm-s' }, plot);
            const attrs = { d: 'M' + pts(vals), class: `lm-line lm-${kind}` };
            if (kind === 'sf') attrs.filter = 'url(#lm-glow)';
            svgEl('path', attrs, g);
            return g;
        });
        const heads = LANDMARKS.map(([, kind]) => {
            const attrs = { r: kind === 'other' ? 3.5 : kind === 'sf' ? 6 : 5, class: `lm-head lm-head-${kind}` };
            if (kind === 'sf') attrs.filter = 'url(#lm-glow)';
            return svgEl('circle', attrs, svg);
        });

        // the scanner: a hairline plus a thumb that rides the x axis
        const scan = svgEl('g', { class: 'lm-scan' }, svg);
        svgEl('line', { y1: m.t - 6, y2: m.t + ph + 6, class: 'lm-scan-line' }, scan);
        svgEl('rect', { x: -27, y: m.t + ph + 8, width: 54, height: 20, rx: 10, class: 'lm-scan-pill' }, scan);
        const scanTxt = svgEl('text', { x: 0, y: m.t + ph + 22, 'text-anchor': 'middle', class: 'lm-scan-txt' }, scan);

        // end annotations (wide layouts only; the legend covers narrow ones)
        const ann = svgEl('g', { class: 'lm-ann' }, svg);
        if (!narrow) {
            const end = (k) => LANDMARKS.find((d) => d[1] === k)[2][N];
            const xe = X(N) + 16;
            const ySf = Y(end('sf'));
            const yReal = Math.min(Y((end('ff') + end('dfd')) / 2), ySf - 18);
            const label = (y, key, text, cls) => {
                svgEl('line', { x1: xe, x2: xe + 14, y1: y, y2: y, class: 'lm-key ' + key }, ann);
                svgEl('text', { x: xe + 20, y: y + 4, class: cls }, ann).textContent = text;
            };
            label(yReal, 'lm-key-real', 'Real videos', 'lm-ann-txt');
            label(ySf + 4, 'lm-key-sf', 'SynthForensics', 'lm-ann-txt is-sf');
            const others = LANDMARKS.filter((d) => d[1] === 'other').map((d) => d[2][N]);
            const y1 = Y(Math.max(...others)), y2 = Y(Math.min(...others));
            svgEl('path', { d: `M${xe},${y1}h6V${y2}h-6`, class: 'lm-bracket' }, ann);
            const t = svgEl('text', { x: xe + 14, y: (y1 + y2) / 2 - 4, class: 'lm-ann-txt' }, ann);
            t.textContent = '9 existing';
            svgEl('text', { x: xe + 14, y: (y1 + y2) / 2 + 12, class: 'lm-ann-txt' }, ann).textContent = 'benchmarks';
        }

        // hover a line to light it up and read its name (no values: they are read off a figure)
        const tag = document.createElement('div');
        tag.className = 'lm-tag';
        lmEl.appendChild(tag);
        const moveTag = (e) => {
            const r = lmEl.getBoundingClientRect();
            tag.style.left = e.clientX - r.left + 'px';
            tag.style.top = e.clientY - r.top + 'px';
        };
        const hits = svgEl('g', {}, svg);
        LANDMARKS.forEach(([name, , vals], k) => {
            const h = svgEl('path', { d: 'M' + pts(vals), class: 'lm-hit' }, hits);
            h.addEventListener('pointerenter', (e) => {
                if (lmP < 0.999) return;
                svg.classList.add('is-hl');
                series[k].classList.add('is-on');
                tag.textContent = name;
                tag.classList.add('is-on');
                moveTag(e);
            });
            h.addEventListener('pointermove', moveTag);
            h.addEventListener('pointerleave', () => {
                svg.classList.remove('is-hl');
                series[k].classList.remove('is-on');
                tag.classList.remove('is-on');
            });
        });

        lmUpdate = (p) => {
            const t = p * N, sx = X(t);
            clip.setAttribute('width', sx + 1);
            LANDMARKS.forEach(([, , vals], k) => {
                heads[k].setAttribute('cx', sx);
                heads[k].setAttribute('cy', Y(at(vals, t)));
            });
            scan.setAttribute('transform', `translate(${sx},0)`);
            scanTxt.textContent = 'τ ' + (LM_TAU[0] + t * 0.1).toFixed(2);
            svg.classList.toggle('is-empty', p <= 0.001);
            svg.classList.toggle('is-scanning', p > 0.001 && p < 0.999);
            svg.classList.toggle('is-done', p >= 0.999);
        };
        lmUpdate(lmP);
    }
    renderLandmarks();
    let lmW = lmEl ? lmEl.clientWidth : 0;
    addEventListener('sf:resize', () => {
        if (!lmEl || lmEl.clientWidth === lmW) return;
        lmW = lmEl.clientWidth;
        renderLandmarks();
    });

    drawValidLoop();
    addEventListener('sf:resize', drawValidLoop);
    addEventListener('load', drawValidLoop);
    if (document.fonts) document.fonts.ready.then(drawValidLoop);

    /* ------------------------------------------------------------------
       Download lockups: size each SVG to its lettering once fonts load
       ------------------------------------------------------------------ */
    const fitLockups = () => $$('.bl-art').forEach((svg) => {
        const t = svg.querySelector('.bl-word');
        if (!t) return;
        const b = t.getBBox();
        const h = svg.viewBox.baseVal.height;
        svg.setAttribute('viewBox', `0 0 ${Math.ceil(b.x + b.width + 8)} ${h}`);
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitLockups);

    /* ------------------------------------------------------------------
       Text splitting helpers
       ------------------------------------------------------------------ */
    function splitWords(el, cls) {
        const walk = (node) => {
            [...node.childNodes].forEach((n) => {
                if (n.nodeType === 3) {
                    const parts = n.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    parts.forEach((p) => {
                        if (!p) return;
                        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
                        const s = document.createElement('span');
                        s.className = cls;
                        s.textContent = p;
                        frag.appendChild(s);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1) {
                    walk(n);
                }
            });
        };
        walk(el);
        return $$('.' + cls, el);
    }

    function formatCount(v, decimals) {
        return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
    }

    /* ------------------------------------------------------------------
       No GSAP or reduced motion: static page
       ------------------------------------------------------------------ */
    if (!hasGSAP || reduceMotion) {
        root.classList.add('static-mode');
        protocol.classList.add('is-final');
        renderChart('zs', false);
        initSideNavStatic();
        // pipeline: steps stacked, each shown in its settled state
        $$('.z-stage').forEach((el) => el.classList.add('is-active'));
        return;
    }

    root.classList.add('js-ready');
    gsap.registerPlugin(ScrollTrigger);
    // refresh on real resizes only ('sf:resize' below), never because the address bar moved
    ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });
    // On phones the address bar slides away as soon as a scroll starts and the viewport grows under the
    // pinned hero: that is the jolt before the zoom. Letting ScrollTrigger drive touch scrolling keeps the
    // bar in place and the pinned scenes in step with the finger.
    const normalizeTouch = ScrollTrigger.isTouch === 1;
    if (normalizeTouch) ScrollTrigger.normalizeScroll({ type: 'touch' });

    /* Smooth scrolling */
    let lenis = null;
    if (window.Lenis) {
        lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
        window.sfLenis = lenis;
    }

    // The touch normalizer takes every swipe for the page, so the open mobile menu could not scroll:
    // while it is open the swipes go to the menu (data-lenis-prevent) and the page behind stays still.
    addEventListener('sf:menu', ({ detail: open }) => {
        if (normalizeTouch) ScrollTrigger.normalizeScroll(open ? false : { type: 'touch' });
        if (lenis) open ? lenis.stop() : lenis.start();
    });

    $$('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            const el = id === '#overview' ? 0 : $(id);
            if (el === null) return;
            e.preventDefault();
            closeMenu();
            if (lenis) lenis.scrollTo(el, { duration: 1.6 });
            else window.scrollTo({ top: el === 0 ? 0 : el.getBoundingClientRect().top + scrollY, behavior: 'smooth' });
        });
    });

    /* ------------------------------------------------------------------
       Brand letters
       ------------------------------------------------------------------ */
    const brand = $('.brand');
    brand.innerHTML = [...brand.textContent].map((ch) => `<span class="ch">${ch}</span>`).join('');
    const heroSlot = $('.brand-hero-slot');
    const sideSlot = $('.brand-slot');
    const mobileSlot = $('.brand-slot-mobile');
    const sidebar = $('.sidebar');
    const topbar = $('.topbar');
    const stage = $('.hero-stage');

    const geo = { from: {}, to: {}, zoom: {} };

    // where the title rests in the hero (the scroll animation moves the hero copy up: measure it at rest)
    function measureFrom() {
        const copy = $('.hero-copy');
        const copyT = copy.style.transform;
        copy.style.transform = 'none';
        const st = stage.getBoundingClientRect();
        const hr = heroSlot.getBoundingClientRect();
        copy.style.transform = copyT;
        geo.from = { x: hr.left - st.left, y: hr.top - st.top };
    }

    function measure() {
        // Brand: hero slot -> sidebar (or top bar) slot
        const hs = getComputedStyle(heroSlot);
        brand.style.fontSize = hs.fontSize;
        measureFrom();

        const target = isDesktop() ? sideSlot : mobileSlot;
        const holder = isDesktop() ? sidebar : topbar;
        const prev = holder.style.transform;
        holder.style.transform = 'none';
        const tr = target.getBoundingClientRect();
        holder.style.transform = prev;
        geo.to = { x: tr.left, y: tr.top, s: parseFloat(getComputedStyle(target).fontSize) / parseFloat(hs.fontSize) };

        // Wall: cover-fit 16:9 mosaic, then zoom so the target tile fills the content area
        const W = innerWidth, H = innerHeight;
        const ww = Math.max(W, H * 16 / 9), wh = ww * 9 / 16;
        const wl = (W - ww) / 2, wt = (H - wh) / 2;
        Object.assign(wall.style, { width: ww + 'px', height: wh + 'px', left: wl + 'px', top: wt + 'px' });
        const tw = ww / COLS, th = wh / ROWS;
        const cx = (TARGET.c + 0.5) * tw, cy = (TARGET.r + 0.5) * th;
        const areaL = isDesktop() ? SIDEBAR : 0;
        const tx = areaL + (W - areaL) / 2, ty = H * 0.42;
        const s = Math.min((H * 0.74) / th, ((W - areaL) * 0.86) / tw);
        gsap.set(wall, { transformOrigin: `${cx}px ${cy}px` });
        geo.zoom = { x: tx - (wl + cx), y: ty - (wt + cy), s };
    }
    measure();
    gsap.set(brand, { x: geo.from.x, y: geo.from.y, scale: 1 });

    /* ------------------------------------------------------------------
       Intro
       ------------------------------------------------------------------ */
    const covers = $$('.cover', grid);
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
    intro
        .to(covers, {
            opacity: 0, duration: 1.1, ease: 'power2.out',
            stagger: { grid: [ROWS, COLS], from: 'center', amount: 1.1 }
        }, 0)
        .from('.brand .ch', { yPercent: 70, opacity: 0, duration: 1.2, stagger: 0.035 }, 0.35)
        .from('.hero-venue', { y: 20, opacity: 0, duration: 1 }, 0.55)
        .from('.hero-sub', { y: 24, opacity: 0, duration: 1 }, 0.75)
        .from('.hero-cta .btn', { y: 24, opacity: 0, duration: 1, stagger: 0.08 }, 0.85)
        .add(() => covers.forEach((c) => c.remove()));

    /* ------------------------------------------------------------------
       Hero scroll sequence: title flies into the sidebar, the wall zooms
       into one face, the claim is revealed
       ------------------------------------------------------------------ */
    const shade = $('.hero-shade');
    const brandFly = gsap.fromTo(brand,
        { x: () => geo.from.x, y: () => geo.from.y, scale: 1 },
        { x: () => geo.to.x, y: () => geo.to.y, scale: () => geo.to.s, duration: 0.4, ease: 'power3.inOut', immediateRender: false });
    const heroTl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: '+=170%',
            pin: true,
            refreshPriority: 3,   // pinned sections are measured top to bottom
            scrub: 0.7,
            invalidateOnRefresh: true,
            onRefreshInit: measure,
            onRefresh(self) {
                // measure again now that the pin has its new size: while the hero is pinned, the first
                // pass still sees it at its old height and would park the title too high on the way back
                // (only the title's flight depends on it, so only that tween is re-read)
                measure();
                brandFly.invalidate();
                heroTl.render(heroTl.totalTime(), true, true);
                if (self.progress === 0) gsap.set(brand, { x: geo.from.x, y: geo.from.y, scale: 1 });
            },
            onUpdate(self) {
                // colour and shadow change once, by class (a CSS transition), not on every frame
                brand.classList.toggle('is-docked', self.progress > 0.24);
                wall.classList.toggle('is-zooming', self.progress > 0.04);
                targetCell.classList.toggle('is-locked', self.progress > 0.52);
            },
            onLeave: () => video.pause(),
            onEnterBack: () => video.play?.().catch(() => { })
        }
    });

    // Whenever the hero is back at its very start, put the title exactly on its slot as laid out at
    // that moment, so it can never end up over the NeurIPS badge, whatever moved in between.
    let brandHome = true;
    heroTl.eventCallback('onUpdate', () => {
        const home = heroTl.progress() < 0.0005;
        if (home && !brandHome) {
            measureFrom();
            brandFly.invalidate();
            gsap.set(brand, { x: geo.from.x, y: geo.from.y, scale: 1 });
        }
        brandHome = home;
    });
    // web fonts change the hero's line breaks: measure again once they are in
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

    heroTl
        // (the intro animates the children; the scroll fades their container, so the two never fight)
        .to('.hero-copy', { autoAlpha: 0, y: -50, duration: 0.18, ease: 'power2.in' }, 0)
        .to('.scroll-cue', { autoAlpha: 0, duration: 0.1 }, 0)
        .add(brandFly, 0)
        .fromTo(isDesktop() ? sidebar : topbar,
            isDesktop() ? { xPercent: -100 } : { yPercent: -100 },
            isDesktop() ? { xPercent: 0, duration: 0.26, ease: 'power3.out' } : { yPercent: 0, duration: 0.26, ease: 'power3.out' },
            0.2)
        .fromTo('.sidenav li', { x: -24, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.16, stagger: 0.012, ease: 'power2.out' }, 0.3)
        .to(wall, { x: () => geo.zoom.x, y: () => geo.zoom.y, scale: () => geo.zoom.s, duration: 0.62, ease: 'power2.inOut' }, 0.04)
        .to('.wall-dim', { opacity: 0.86, duration: 0.3 }, 0.26)
        .to(shade, { opacity: 0.45, duration: 0.3 }, 0.1)
        .fromTo('.reveal-big span', { autoAlpha: 0, y: 60, ...(touchOnly ? {} : { filter: 'blur(12px)' }) },
            { autoAlpha: 1, y: 0, ...(touchOnly ? {} : { filter: 'blur(0px)' }), duration: 0.12, stagger: 0.035, ease: 'power3.out' }, 0.62)
        .fromTo('.reveal-small', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.78)
        .to({}, { duration: 0.14 });

    /* ------------------------------------------------------------------
       Sections
       ------------------------------------------------------------------ */

    // Section titles: word mask reveal
    $$('[data-split]').forEach((h) => {
        const words = splitWords(h, 'w');
        words.forEach((w) => { w.innerHTML = `<span>${w.textContent}</span>`; });
        gsap.from($$('.w > span', h), {
            yPercent: 110, duration: 1.1, stagger: 0.06, ease: 'expo.out',
            scrollTrigger: { trigger: h, start: 'top 85%' }
        });
    });

    // Generic fade-up for blocks of content
    const revealTargets = [
        '#abstract .eyebrow', '.paper-title', '.authors', '.affil', '.lead',
        '.rz-copy', '.results-top', '.results-more', '.tree', '.ds-grid .code-card',
        '#download .code-card', '.fine', '#citation .code-card', '.upd-live', '.upd-log li'
    ];
    // Fade-up with explicit end values; inline styles are cleared at the end so CSS hover
    // transforms (cards lifting) take over again without fighting GSAP.
    const reveal = (els, trigger, y, stagger, start) => gsap.fromTo(els, { y, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1.1, stagger, ease: 'expo.out',
        scrollTrigger: { trigger, start },
        onComplete: () => {
            gsap.set(els, { clearProps: 'transform,translate,rotate,scale,opacity' });
            [].concat(els).forEach((e) => e.classList.add('is-in'));
        }
    });
    $$(revealTargets.join(',')).forEach((el) => reveal(el, el, 40, 0, 'top 88%'));

    // Staggered cards
    gsap.fromTo('.gen', { y: 40, opacity: 0, filter: 'blur(8px)' }, {
        y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out',
        stagger: { each: 0.07, grid: [2, 4], from: 'start' },
        scrollTrigger: { trigger: '.gens', start: 'top 82%' },
        onComplete: () => gsap.set('.gen', { clearProps: 'transform,translate,rotate,scale,opacity,filter' })
    });
    [['.team', 'figure'], ['.realism-nums', ':scope > div']].forEach(([wrapSel, itemSel]) => {
        const w = $(wrapSel);
        if (w) reveal($$(itemSel, w), w, 60, 0.08, 'top 85%');
    });

    // Download: logo lockups draw their outline when they come into view
    $$('.brandlink').forEach((el, i) => {
        ScrollTrigger.create({
            trigger: el, start: 'top 85%', once: true,
            onEnter: () => setTimeout(() => {
                el.classList.add('is-drawn');
                setTimeout(() => el.classList.add('is-settled'), 2600);
            }, i * 350)
        });
    });

    // Abstract: words light up as you read
    const absWords = splitWords($('.abstract-text'), 'word');
    gsap.to(absWords, {
        opacity: 1, stagger: 0.04, ease: 'none',
        scrollTrigger: { trigger: '.abstract-text', start: 'top 78%', end: 'bottom 52%', scrub: 0.4 }
    });

    // Counters
    $$('[data-count]').forEach((el) => {
        const end = parseFloat(el.dataset.count);
        const dec = parseInt(el.dataset.decimals || '0', 10);
        const suffix = el.dataset.suffix || '';
        const obj = { v: 0 };
        el.textContent = formatCount(0, dec) + suffix;
        gsap.to(obj, {
            v: end, duration: 2, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 90%' },
            onUpdate: () => { el.textContent = formatCount(obj.v, dec) + suffix; }
        });
    });
    gsap.from('.stat', {
        y: 30, opacity: 0, duration: 1, stagger: 0.07, ease: 'expo.out',
        scrollTrigger: { trigger: '.stats', start: 'top 85%' }
    });

    // Realism charts: played once when they come into view, then left as they are
    // (scroll-triggered timelines, so they also play when the page loads below them)
    if (fqEl) {
        const rows = $$('.fq-row', fqEl);
        const fqTl = gsap.timeline({ scrollTrigger: { trigger: fqEl, start: 'top 78%', once: true } });
        rows.forEach((row, i) => {
            const val = $('.fq-val', row);
            const v = +val.dataset.v, o = { v: 0 }, d = 0.05 + i * 0.06;
            fqTl.fromTo(row, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, d)
                .fromTo($('.fq-bar', row), { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.out' }, d + 0.1)
                .fromTo(val, { left: '0%' }, { left: (v / FQ_MAX) * 100 + '%', duration: 1.2, ease: 'expo.out' }, d + 0.1)
                .fromTo(o, { v: 0 }, { v, duration: 1.2, ease: 'expo.out', onUpdate: () => { val.textContent = o.v.toFixed(3); } }, d + 0.1);
        });
        // then the real-video range opens up, the rest steps back and SynthForensics lights up inside it
        const T = 0.05 + rows.length * 0.06 + 0.6;
        fqTl.fromTo('.fq-band', { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.9, ease: 'expo.out' }, T)
            .to(rows.filter((r) => r.classList.contains('is-other')), { opacity: 0.35, duration: 0.6, ease: 'power2.out' }, T + 0.5)
            .fromTo('.fq-row.is-sf', { '--glow': 0 }, { '--glow': 1, duration: 0.6 }, T + 0.5)
            .fromTo('.fq-flag', { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, T + 0.7);
    }

    // Landmarks: a scanner sweeps the thresholds, each line drawn up to it with a dot riding its tip
    if (lmEl) {
        const lmState = { p: 0 };
        lmP = 0;
        lmUpdate(0);
        gsap.to(lmState, {
            p: 1, duration: 2.6, delay: 0.1, ease: 'power1.inOut',
            scrollTrigger: { trigger: lmEl, start: 'top 75%', once: true },
            onUpdate: () => { lmP = lmState.p; lmUpdate(lmP); }
        });
    }

    // Results chart: the rows built at load stay hidden until the chart comes into view, then they are
    // rebuilt with their entrance once (a scroll-triggered timeline also plays if the page loads below it)
    $$('.row, .row-group', rowsEl).forEach((r) => { r.style.opacity = 0; });
    gsap.set('.tk-big, .tk-label, .tk-body', { opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: '.results-body', start: 'top 82%', once: true } })
        .call(() => {
            if (chartShown) return;
            chartShown = true;
            gsap.set('.tk-big, .tk-label, .tk-body', { clearProps: 'opacity' });
            renderChart('zs', true);
        }, null, 0.01)
        .to({}, { duration: 0.02 });

    /* ------------------------------------------------------------------
       Pipeline: depth fly-through. The camera travels along z: each step
       appears on the horizon, comes into focus, then passes the viewer
       while the next one approaches. Frames and particles stream past.
       ------------------------------------------------------------------ */
    const zSection = $('.pipeline');
    const zScene = $('.z-scene');
    const zStages = $$('.z-stage');
    const zSteps = $$('.z-progress button');
    const zNav = $('.z-progress');
    const Z_D = 1400;                  // distance between two steps on the z axis
    const ZP = 1000;                   // CSS perspective of the scene
    const Z_M = zStages.length - 1;    // segments travelled
    zSection.classList.add('z-anim');

    // stagger index for the in-step animations
    $$('.z-fields, .z-cats, .z-gens, .z-crit, .z-v-versions').forEach((list) =>
        [...list.children].forEach((c, i) => c.style.setProperty('--i', i)));

    // particles: small squares and dots scattered off the centre
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const zBits = [];
    const addBit = (kind, ax, ay, z, base) => {
        const el = document.createElement('span');
        el.className = 'z-bit ' + kind;
        el.setAttribute('aria-hidden', 'true');
        zScene.appendChild(el);
        const b = { el, kind, ax, ay, z, base };
        zBits.push(b);
        return b;
    };
    for (let k = 0; k < 80; k++) {
        const kind = k % 3 === 0 ? 'dot' : 'sq';
        const a = rand() * Math.PI * 2, r = 0.4 + rand() * 0.6;
        const b = addBit(kind, Math.cos(a) * r, Math.sin(a) * r * 0.75, -Z_D * 0.8 + rand() * Z_D * (Z_M + 1.6), kind === 'dot' ? 0.9 : 0.7);
        b.size = kind === 'sq' ? 8 + rand() * 18 : 4;
        if (kind === 'sq') b.el.style.setProperty('--s', b.size + 'px');
    }
    // video frames: five per step, the same size, placed just behind the step (each at its own depth,
    // for a little parallax) so they surround it and then fly past with it. Each one gets a direction
    // around the step - five sectors, with a seeded rotation and jitter - and zMeasure() parks it just
    // outside the step's content in that direction.
    const THUMBS = ['t_wan', 't_sky', 't_self', 't_cog', 't_magi', 't_ltx', 't_davinci', 't_helios', 'd_wan', 'd_self', 'd_sky', 'd_magi', 'd_cog'];
    const zFrames = [];
    for (let i = 0, j = 0; i <= Z_M; i++) {
        const base = rand() * Math.PI * 2;
        for (let k = 0; k < 5; k++) {
            const b = addBit('img', 0, 0, 0, 0.8);
            b.el.innerHTML = `<img src="assets/frames/${THUMBS[j++ % THUMBS.length]}.jpg" alt="" loading="lazy">`;
            b.dz = 70 + rand() * 150;
            b.z = i * Z_D + b.dz;
            Object.assign(b, { step: i, ang: base + k * (Math.PI * 2 / 5) + (rand() - 0.5) * 0.7, extra: rand() * 60 });
            zFrames.push(b);
        }
    }
    let zImgW = 150;

    const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    // scroll progress -> camera position (in steps), holding on each step for a while
    const zToS = (p) => {
        const f = Math.min(p, 0.99999) * Z_M, seg = Math.floor(f);
        return seg + smooth((f - seg - 0.3) / 0.5);
    };
    const zState = { p: 0 };
    let zActive = -1;
    // scale each step down if it is taller or wider than the room left by the progress bar
    // A stage is as wide as the scene allows, but its diagram can be wider and spill over
    // both edges; measure the diagram at its natural width so the stage is scaled to fit it.
    const naturalWidth = (el) => {
        const prev = el.style.width;
        el.style.width = 'max-content';
        const w = el.offsetWidth;
        el.style.width = prev;
        return w;
    };
    function zMeasure() {
        const W = zScene.clientWidth, H = zScene.clientHeight;
        zStages.forEach((el) => {
            const v = $('.z-v', el);
            const vw = v ? naturalWidth(v) : 0;
            el._k = Math.min(1, (H - (H < 560 ? 110 : 150)) / el.offsetHeight, (W - 24) / Math.max(el.offsetWidth, vw));
            // the area the step's text and diagram actually cover, to keep the frames out of it
            el._cw = Math.max(Math.min(el.offsetWidth, naturalWidth($('.z-head', el) || el)), vw);
            el._ch = el.offsetHeight;
        });
        zImgW = Math.round(Math.min(160, W * 0.12));
        zScene.style.setProperty('--img', zImgW + 'px');

        // frames sit dz px behind their step: screen = origin + (position - origin) * sc
        const oy = H * 0.46, cy = H * 0.47, gap = 26;
        const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
        const taken = [];   // per step: the frames already parked
        zFrames.forEach((b) => {
            const sc = ZP / (ZP + b.dz), fw = zImgW * sc, fh = zImgW * 0.625 * sc;
            const el = zStages[b.step];
            const cw = el._cw * el._k, ch = el._ch * el._k;
            // walk out from the centre in the frame's direction until it clears the content
            const dx = Math.cos(b.ang), dy = Math.sin(b.ang);
            const ax = cw / 2 + gap + fw / 2 + b.extra, ay = ch / 2 + gap + fh / 2 + b.extra * 0.5;
            const t = Math.min(ax / Math.max(1e-6, Math.abs(dx)), ay / Math.max(1e-6, Math.abs(dy)));
            const fx = clamp(W / 2 + dx * t, fw / 2 + 10, W - fw / 2 - 10);
            const fy = clamp(cy + dy * t, fh / 2 + 10, H - fh / 2 - 84);
            // pushed back on screen it may land on the content or on another frame: then it stays hidden
            const mine = taken[b.step] || (taken[b.step] = []);
            b.off = (Math.abs(fx - W / 2) < cw / 2 + fw / 2 + 8 && Math.abs(fy - cy) < ch / 2 + fh / 2 + 8) ||
                mine.some(([x, y, w, h]) => Math.abs(fx - x) < fw / 2 + w + 12 && Math.abs(fy - y) < fh / 2 + h + 12);
            if (!b.off) mine.push([fx, fy, fw / 2, fh / 2]);
            b.px = (fx - W / 2) / sc;
            b.py = (fy - oy) / sc + oy - cy;
        });
    }
    zMeasure();

    // counters show 0 until their step first comes into focus, then count up once
    $$('.z-count').forEach((c) => { c.textContent = '0'; });
    function zCount(stage) {
        $$('.z-count', stage).forEach((c) => {
            if (c.dataset.done) return;
            c.dataset.done = '1';
            const o = { v: 0 }, to = +c.dataset.to;
            gsap.to(o, { v: to, duration: 1.6, ease: 'expo.out', onUpdate: () => { c.textContent = Math.round(o.v).toLocaleString('en-US'); } });
        });
    }

    // Quality control: one video goes round the review loop while its step is in focus -
    // rejected by one annotator, prompt edited and parameters tuned, regenerated, accepted by all five
    const qc = $('.z-v-qc');
    const qcStep = qc ? zStages.indexOf(qc.closest('.z-stage')) : -1;
    let qcTl = null, qcReset = null;
    if (qc) {
        const people = $$('.qc-people li', qc), attempt = $('.qc-try b', qc);
        const clear = () => people.forEach((li) => { li.className = ''; });
        const phase = (p) => () => { qc.dataset.phase = p; };
        const mark = (i, ok) => () => { people[i].className = ok ? 'is-ok' : 'is-no'; };
        // the words added to the prompt and the new parameter values are typed in, one after the other
        const typed = $$('.qc-fix ins', qc).map((el) => ({ el, text: el.textContent }));
        const start = () => {
            clear();
            attempt.textContent = '1';
            qc.dataset.phase = 'try1';
            typed.forEach(({ el }) => { el.textContent = ''; el.classList.remove('is-typing'); });
        };
        qcTl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2.6 }).call(start, null, 0.01);
        [true, true, false, true, true].forEach((ok, i) => qcTl.call(mark(i, ok), null, 0.7 + i * 0.35));
        qcTl.call(phase('rejected'), null, 2.6).call(phase('fix'), null, 3.7);
        let at = 4.0;
        typed.forEach(({ el, text }) => {
            const o = { n: 0 }, dur = Math.max(0.25, text.length * 0.045);
            qcTl.fromTo(o, { n: 0 }, {
                n: text.length, duration: dur, ease: 'none',
                onStart: () => el.classList.add('is-typing'),
                onUpdate: () => { el.textContent = text.slice(0, Math.round(o.n)); },
                onComplete: () => el.classList.remove('is-typing')
            }, at);
            at += dur + 0.25;
        });
        const regen = at + 0.5;
        qcTl.call(() => { clear(); attempt.textContent = '2'; qc.dataset.phase = 'regen'; }, null, regen)
            .call(phase('try2'), null, regen + 1.1);
        people.forEach((li, i) => qcTl.call(mark(i, true), null, regen + 1.3 + i * 0.3));
        qcTl.call(phase('accepted'), null, regen + 3).to({}, { duration: 0.01 }, regen + 3.1);
        start();
        qcReset = start;
    }

    function zRender() {
        const s = zToS(zState.p);
        const W = zScene.clientWidth, H = zScene.clientHeight;
        zStages.forEach((el, i) => {
            const z = (s - i) * Z_D;
            let o, blur;
            if (z < 0) { const far = -z / Z_D; o = 1 - far * 0.9; blur = Math.min(12, far * 7); }
            else { const n = z / 520; o = 1 - n; blur = n * 9; }
            o = Math.max(0, Math.min(1, o));
            if (o < 0.01) { el.style.visibility = 'hidden'; return; }
            el.style.visibility = 'visible';
            el.style.opacity = o.toFixed(3);
            el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';
            el.style.transform = `translate(-50%, -50%) translate3d(0, 0, ${z.toFixed(1)}px) scale(${(el._k || 1).toFixed(3)})`;
            el.style.zIndex = String(2000 + Math.round(z / 5));
            el.style.pointerEvents = Math.abs(z) < Z_D * 0.25 ? 'auto' : 'none';
        });
        // on-screen boxes of the steps in view (perspective 1000px, origin at 50% 46%)
        const P = ZP, oy = H * 0.46;
        const keepOut = [];
        zStages.forEach((el, i) => {
            const z = (s - i) * Z_D;
            if (z < -Z_D || z > 520) return;
            const sc = P / (P - z), k = sc * (el._k || 1);
            keepOut.push([W / 2, oy + (H * 0.47 - oy) * sc, el._cw * k / 2 + 28, el._ch * k / 2 + 28]);
        });
        zBits.forEach((b) => {
            const z = s * Z_D - b.z;
            let o = z < 0 ? 1 + z / (2.4 * Z_D) : 1 - z / 640;
            o = Math.max(0, Math.min(1, o)) * b.base;
            if (o < 0.01 || z > 900 || b.off) { b.el.style.visibility = 'hidden'; return; }
            const x = b.kind === 'img' ? b.px : b.ax * W * 0.55, y = b.kind === 'img' ? b.py : b.ay * H * 0.55;
            // anything that would sit behind a step's text or diagram fades out until it is clear of it
            const sc = P / (P - z);
            const fx = W / 2 + x * sc, fy = oy + (H * 0.47 + y - oy) * sc;
            const hw = (b.kind === 'img' ? zImgW : b.size) * sc / 2, hh = (b.kind === 'img' ? zImgW * 0.625 : b.size) * sc / 2;
            if (keepOut.some(([cx, cy, rw, rh]) => Math.abs(fx - cx) < hw + rw && Math.abs(fy - cy) < hh + rh)) o = 0;
            b.el.style.visibility = 'visible';
            b.el.style.opacity = o.toFixed(3);
            b.el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px)`;
            b.el.style.zIndex = String(2000 + Math.round(z / 5));
        });
        if (qcTl && Math.abs(s - qcStep) > 0.95 && qc.dataset.phase !== 'try1') { qcTl.pause(); qcReset(); }
        // step in focus: settle its inner animations, update the progress bar
        const near = Math.round(s);
        const active = Math.abs(s - near) < 0.2 ? near : -1;
        if (active !== zActive) {
            zStages.forEach((el, i) => el.classList.toggle('is-active', i === active));
            if (active >= 0) zCount(zStages[active]);
            if (qcTl) { if (active === qcStep) qcTl.restart(); else qcTl.pause(); }
            zActive = active;
        }
        zSteps.forEach((btn) => {
            const n = +btn.dataset.step;
            btn.classList.toggle('is-on', n === near);
            btn.classList.toggle('is-done', n < near);
        });
        zNav.classList.toggle('is-idle', s < 0.5);
    }

    const zTween = gsap.to(zState, {
        p: 1,
        ease: 'none',
        onUpdate: zRender,
        scrollTrigger: {
            trigger: zSection,
            start: 'top top',
            end: () => '+=' + innerHeight * 7,
            pin: '.pipeline-pin',
            refreshPriority: 1,
            scrub: 0.8,
            invalidateOnRefresh: true
        }
    });
    zRender();
    addEventListener('sf:resize', () => { zMeasure(); zRender(); });
    zSteps.forEach((btn) => btn.addEventListener('click', () => {
        const n = +btn.dataset.step;
        const p = n === 0 ? 0 : (n - 1 + 0.82) / Z_M;
        const st = zTween.scrollTrigger;
        const y = st.start + (st.end - st.start) * p;
        if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: 'smooth' });
    }));

    /* ------------------------------------------------------------------
       Paired protocol: pinned four-step story
       1 real video -> 2 structured caption -> 3 eight generators -> 4 twins
       ------------------------------------------------------------------ */
    const pReal = $('.p-real');
    const pScan = $('.p-scan');
    const pCap = $('.p-caption');
    const pCards = $$('.p-card');
    const pSteps = $$('.p-steps li');
    const pRows = $$('.cap-row');
    const capWords = splitWords($('.cap-text'), 'cw');
    const CENTER = { left: 220, top: 180, width: 200, height: 150 };

    // starting state: the real video alone, large
    gsap.set(pReal, { left: 70, top: 45, width: 500, height: 375 });
    gsap.set(pCap, { left: 290, top: 8, width: 350, height: 512, opacity: 0, x: 30 });
    gsap.set(pRows, { opacity: 0, y: 10 });
    gsap.set(capWords, { opacity: 0 });
    gsap.set('.p-note', { opacity: 0, y: 10 });
    pCards.forEach((c) => gsap.set(c, {
        x: CENTER.left - +c.dataset.x, y: CENTER.top - +c.dataset.y, scale: 0.3, opacity: 0
    }));

    const setPStep = (p) => {
        const idx = p < 0.1 ? 0 : p < 0.4 ? 1 : p < 0.74 ? 2 : 3;
        pSteps.forEach((li, i) => li.classList.toggle('is-active', i === idx));
        protocol.classList.toggle('is-final', p > 0.82);
    };

    gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: {
            trigger: protocol,
            start: 'top top',
            end: () => '+=' + innerHeight * 2.8,
            pin: '.protocol-pin',
            refreshPriority: 2,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => setPStep(self.progress)
        }
    })
        // 2 · describe: the frame moves aside and gets scanned, the caption fills in
        .to(pReal, { left: 0, top: 150, width: 260, height: 195, duration: 0.14 }, 0.08)
        .fromTo(pScan, { top: '-18%', opacity: 1 }, { top: '100%', duration: 0.18, ease: 'none' }, 0.12)
        .to(pScan, { opacity: 0, duration: 0.03 }, 0.3)
        .to(pCap, { opacity: 1, x: 0, duration: 0.1 }, 0.13)
        .to(pRows, { opacity: 1, y: 0, duration: 0.06, stagger: 0.018 }, 0.16)
        .to(capWords, { opacity: 1, duration: 0.01, stagger: 0.006, ease: 'none' }, 0.18)
        // 3 · generate: the caption collapses into the prompt, eight twins fly out of it
        .to(pReal, { opacity: 0, scale: 0.92, duration: 0.08 }, 0.4)
        .to('.cap-full', { opacity: 0, duration: 0.05 }, 0.4)
        .to(pCap, { left: CENTER.left, top: CENTER.top, width: CENTER.width, height: CENTER.height, duration: 0.1 }, 0.41)
        .to('.cap-prompt', { opacity: 1, duration: 0.05 }, 0.48)
        .to(pCards, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.12, stagger: 0.015, ease: 'power3.out' }, 0.5)
        // 4 · compare: the real video takes the centre, surrounded by its twins
        .to(pCap, { opacity: 0, scale: 0.9, duration: 0.05 }, 0.74)
        .set(pReal, { ...CENTER, scale: 1.25 }, 0.76)
        .to(pReal, { opacity: 1, scale: 1, duration: 0.1, ease: 'power3.out' }, 0.77)
        .to('.p-note', { opacity: 1, y: 0, duration: 0.08 }, 0.84)
        .to({}, { duration: 0.1 });

    /* ------------------------------------------------------------------
       Side navigation: active section + moving indicator
       ------------------------------------------------------------------ */
    const navLinks = $$('.sidenav a');
    const indicator = $('.sidenav-indicator');
    function setActive(id) {
        navLinks.forEach((a) => {
            const on = a.getAttribute('href') === '#' + id;
            a.classList.toggle('is-active', on);
            if (on) {
                indicator.style.opacity = 1;
                const top = a.getBoundingClientRect().top - indicator.parentElement.getBoundingClientRect().top;
                indicator.style.height = a.offsetHeight - 14 + 'px';
                indicator.style.transform = `translateY(${top + 7}px)`;
            }
        });
        if (!id) indicator.style.opacity = 0;
    }
    const navSecs = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
    let navCur = null;
    const pickSection = () => {
        const cur = currentSection(navSecs);
        if (cur !== navCur) { navCur = cur; setActive(cur); }
    };
    addEventListener('scroll', pickSection, { passive: true });
    addEventListener('sf:resize', pickSection);
    pickSection();

    addEventListener('load', () => ScrollTrigger.refresh());
    let rz;
    addEventListener('sf:resize', () => { clearTimeout(rz); rz = setTimeout(() => ScrollTrigger.refresh(), 150); });

    /* ------------------------------------------------------------------ */
    function initSideNavStatic() {
        const links = $$('.sidenav a');
        const secs = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
        const pick = () => {
            const cur = currentSection(secs);
            links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur));
        };
        addEventListener('scroll', pick, { passive: true });
        pick();
    }

    // The current section is the last one whose top has passed 45% of the screen ('' while on the hero).
    // The last section is too short to ever reach that line, so it counts once the page is at its end.
    function currentSection(secs) {
        const line = innerHeight * 0.45;
        let cur = '';
        secs.forEach((sec) => { if (sec.getBoundingClientRect().top <= line) cur = sec.id; });
        const atEnd = document.documentElement.scrollHeight - innerHeight - scrollY < 8;
        return atEnd && secs.length ? secs[secs.length - 1].id : cur;
    }
})();
