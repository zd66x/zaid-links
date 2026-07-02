/* =========================================================
   Zaid Khaza'leh — Interactions
   Particles, share modal, copy, toast, smooth entrance
   ========================================================= */

(() => {
    'use strict';

    /* ---------- السنة في الفوتر ---------- */
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ---------- IoT Network Canvas ---------- */
    const canvas = document.getElementById('particles');
    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        let nodes = [];
        let packets = [];
        let raf = null;
        let pulseRings = [];
        const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobile = window.matchMedia('(max-width: 480px)').matches;

        const COUNT = isMobile ? 28 : 55;
        const CONNECT_DIST = isMobile ? 110 : 160;
        const PACKET_INTERVAL = isMobile ? 1800 : 1200; // ms

        function makeNode(x, y) {
            // ثلاثة أنواع: sensor صغير، device متوسط، gateway كبير
            const type = Math.random();
            let r, color;
            if (type < 0.7) {        // sensor
                r = Math.random() * 1.2 + 0.8;
                color = 'rgba(43, 209, 255, ALPHA)';
            } else if (type < 0.92) { // device
                r = Math.random() * 1.8 + 1.4;
                color = 'rgba(124, 92, 255, ALPHA)';
            } else {                  // gateway
                r = Math.random() * 2.4 + 2.0;
                color = 'rgba(255, 92, 138, ALPHA)';
            }
            return {
                x: x ?? Math.random() * window.innerWidth,
                y: y ?? Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.35,
                vy: (Math.random() - 0.5) * 0.35,
                r,
                color,
                // هل هذا الجهاز "active" ويصدر pulse rings؟
                active: Math.random() < 0.18,
                nextPulse: Math.random() * 4000
            };
        }

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = window.innerWidth + 'px';
            canvas.style.height = window.innerHeight + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            nodes = Array.from({ length: COUNT }, () => makeNode());
            packets = [];
            pulseRings = [];
        }

        function spawnPacket() {
            // اختار نقطتين متصلتين وأرسل "حزمة بيانات" بينهما
            if (nodes.length < 2) return;
            const a = nodes[Math.floor(Math.random() * nodes.length)];
            // ابحث عن جار قريب
            const neighbors = [];
            for (const n of nodes) {
                if (n === a) continue;
                const d = Math.hypot(n.x - a.x, n.y - a.y);
                if (d < CONNECT_DIST) neighbors.push({ n, d });
            }
            if (!neighbors.length) return;
            const b = neighbors[Math.floor(Math.random() * neighbors.length)].n;
            packets.push({
                ax: a.x, ay: a.y,
                bx: b.x, by: b.y,
                t: 0,                // 0 → 1 على طول الخط
                speed: 0.006 + Math.random() * 0.008,
                color: Math.random() < 0.5 ? '#2bd1ff' : '#7c5cff'
            });
        }

        function spawnPulse(node) {
            pulseRings.push({
                x: node.x, y: node.y,
                r: node.r,
                maxR: node.r * 6,
                alpha: 0.55
            });
        }

        function step(timestamp) {
            const W = window.innerWidth, H = window.innerHeight;
            ctx.clearRect(0, 0, W, H);

            // ---- تحديث وربط العقد ----
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > W) n.vx *= -1;
                if (n.y < 0 || n.y > H) n.vy *= -1;

                // trigger pulse للأجهزة النشطة
                if (n.active) {
                    n.nextPulse -= 16;
                    if (n.nextPulse <= 0) {
                        spawnPulse(n);
                        n.nextPulse = 3000 + Math.random() * 5000;
                    }
                }
            }

            // ---- خطوط الاتصال بين الأجهزة ----
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const a = nodes[i], b = nodes[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < CONNECT_DIST) {
                        const alpha = (1 - dist / CONNECT_DIST) * 0.22;
                        ctx.strokeStyle = `rgba(124, 92, 255, ${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // ---- حزم البيانات المتحركة على الخطوط ----
            for (let i = packets.length - 1; i >= 0; i--) {
                const p = packets[i];
                p.t += p.speed;
                if (p.t >= 1) { packets.splice(i, 1); continue; }
                const x = p.ax + (p.bx - p.ax) * p.t;
                const y = p.ay + (p.by - p.ay) * p.t;
                // توهج خفيف حول الحزمة
                const grad = ctx.createRadialGradient(x, y, 0, x, y, 12);
                grad.addColorStop(0, p.color + 'cc');
                grad.addColorStop(1, p.color + '00');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.fill();
                // النقطة المركزية
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x, y, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- العقد (الأجهزة) ----
            for (const n of nodes) {
                ctx.fillStyle = n.color.replace('ALPHA', '0.9');
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();

                // halo خفيف حول الجهاز
                const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
                halo.addColorStop(0, n.color.replace('ALPHA', '0.25'));
                halo.addColorStop(1, n.color.replace('ALPHA', '0'));
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // ---- موجات pulse النشطة (إشارة WiFi/بيانات) ----
            for (let i = pulseRings.length - 1; i >= 0; i--) {
                const ring = pulseRings[i];
                ring.r += 0.6;
                ring.alpha -= 0.012;
                if (ring.alpha <= 0) { pulseRings.splice(i, 1); continue; }
                ctx.strokeStyle = `rgba(43, 209, 255, ${ring.alpha})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
                ctx.stroke();
            }

            raf = requestAnimationFrame(step);
        }

        let lastPacket = 0;
        function scheduler(timestamp) {
            if (timestamp - lastPacket > PACKET_INTERVAL) {
                spawnPacket();
                lastPacket = timestamp;
            }
            raf = requestAnimationFrame(scheduler);
        }

        function start() {
            resize();
            if (!prefersReduce) {
                raf = requestAnimationFrame(step);
                raf = requestAnimationFrame(scheduler);
            } else {
                // رسم إطار واحد
                ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                for (const n of nodes) {
                    ctx.fillStyle = n.color.replace('ALPHA', '0.7');
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (raf) cancelAnimationFrame(raf);
                start();
            }, 150);
        });

        start();
    }

    /* ---------- Share Modal ---------- */
    const fab = document.getElementById('share-fab');
    const modal = document.getElementById('share-modal');
    const closeBtn = modal?.querySelector('.modal-close');
    const backdrop = modal?.querySelector('.modal-backdrop');
    const shareLinkInput = document.getElementById('share-link');
    const copyBtn = document.getElementById('copy-btn');

    const SHARE_URL = window.location.href;
    const SHARE_TEXT = '𝑍𝑎𝑖𝑑 𝐾ℎ𝑎𝑧𝑎’𝑙𝑒ℎ — روابطي الرسمية';

    if (shareLinkInput) shareLinkInput.value = SHARE_URL;

    function openModal() {
        modal?.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
    function closeModal() {
        modal?.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    fab?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal?.getAttribute('aria-hidden') === 'false') {
            closeModal();
        }
    });

    /* ---------- شبكات المشاركة ---------- */
    const encodedUrl = encodeURIComponent(SHARE_URL);
    const encodedText = encodeURIComponent(SHARE_TEXT);

    const networkUrls = {
        whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        twitter:  `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        snapchat: `https://www.snapchat.com/scan?attachmentUrl=${encodedUrl}`
    };

    modal?.querySelectorAll('.share-btn[data-network]').forEach(btn => {
        btn.addEventListener('click', () => {
            const network = btn.dataset.network;
            if (network === 'copy') {
                copyToClipboard(SHARE_URL);
                return;
            }
            const url = networkUrls[network];
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
        });
    });

    copyBtn?.addEventListener('click', () => copyToClipboard(SHARE_URL));

    /* ---------- Clipboard ---------- */
    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            showToast('✅ تم نسخ الرابط');
        } catch (e) {
            showToast('⚠️ تعذّر النسخ — انسخ يدويًا');
        }
    }

    /* ---------- Toast ---------- */
    const toast = document.getElementById('toast');
    let toastTimer;
    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
    }

    /* ---------- تأثير hover بالماوس على الكارت (spotlight) ---------- */
    const card = document.querySelector('.card');
    if (card && window.matchMedia('(hover: hover)').matches) {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mx', x + '%');
            card.style.setProperty('--my', y + '%');
        });
    }

    /* ---------- Parallax خفيف للأوربات ---------- */
    const orbs = document.querySelectorAll('.bg-orb');
    if (orbs.length && window.matchMedia('(hover: hover)').matches) {
        let targetX = 0, targetY = 0;
        let currentX = 0, currentY = 0;
        window.addEventListener('mousemove', (e) => {
            targetX = (e.clientX / window.innerWidth - 0.5) * 30;
            targetY = (e.clientY / window.innerHeight - 0.5) * 30;
        });
        function animate() {
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;
            orbs.forEach((orb, i) => {
                const factor = (i + 1) * 0.6;
                orb.style.translate = `${currentX * factor}px ${currentY * factor}px`;
            });
            requestAnimationFrame(animate);
        }
        animate();
    }

    /* ---------- تتبع النقرات (اختياري — لا يعمل افتراضيًا) ---------- */
    document.querySelectorAll('.link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const brand = btn.dataset.brand || 'link';
            // يمكن إضافة Google Analytics / Plausible هنا
            console.log('[click]', brand, btn.href);
        });
    });

})();