/* =============================================================
   THE KELVIN IKPENI GRAND HOTEL — Global JavaScript
   =============================================================
   Loaded on every public page. Contains:
   - API wrapper (apiRequest)
   - Formatters (formatCurrency, formatDate, escapeHtml)
   - Toast notifications (showToast)
   - Navbar scroll effect + mobile menu toggle
   - Active nav link highlighting
   - Hero slider (auto-rotating with dots + pause on hidden)
   - Lightbox for gallery images
   - Scroll reveal on intersection
   - Scroll-to-top floating button with progress ring
   - Reduced-motion support
   ============================================================= */

(function () {
  'use strict';

  /* =============================================================
     API WRAPPER
     ============================================================= */
  async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('kigh_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* =============================================================
     FORMATTERS & UTILITIES
     ============================================================= */
  function formatCurrency(n) {
    return `₦${Number(n || 0).toLocaleString('en-NG')}`;
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c])
    );
  }

  /* =============================================================
     TOAST NOTIFICATIONS
     ============================================================= */
  function showToast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = `toast ${type === 'error' ? 'error' : ''}`;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = message;
    document.body.appendChild(el);

    setTimeout(() => {
      el.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateX(120%)';
      setTimeout(() => el.remove(), 400);
    }, 3800);
  }

  /* =============================================================
     NAVBAR — Scroll effect + mobile menu + active link
     ============================================================= */
  function initNavbar() {
    const nav = document.querySelector('.navbar');
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');

    // Scroll effect
    if (nav) {
      const onScroll = () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Mobile menu toggle
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('open');
        toggle.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
      });

      // Close menu when a link is clicked
      menu.querySelectorAll('a').forEach((a) =>
        a.addEventListener('click', () => {
          menu.classList.remove('open');
          toggle.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        })
      );

      // Close menu on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('open')) {
          menu.classList.remove('open');
          toggle.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Active link highlighting
    const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-menu a[href]').forEach((a) => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (
        href === current ||
        (current === '' && href === 'index.html') ||
        (href !== '/' && current.startsWith(href.replace('.html', '')))
      ) {
        a.classList.add('active');
      }
    });
  }

  /* =============================================================
     SCROLL REVEAL — fade in elements as they enter the viewport
     ============================================================= */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    // Fallback for older browsers
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  /* =============================================================
     HERO SLIDER — auto-rotate with dots, pauses when tab is hidden
     ============================================================= */
  function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (slides.length < 2) return;

    let index = 0;
    let timer = null;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const INTERVAL = 6500;

    const go = (i) => {
      slides.forEach((s, k) => s.classList.toggle('active', k === i));
      dots.forEach((d, k) => {
        d.classList.toggle('active', k === i);
        d.setAttribute('aria-selected', String(k === i));
      });
      index = i;
    };

    const next = () => go((index + 1) % slides.length);

    const start = () => {
      if (prefersReduced) return;
      stop();
      timer = setInterval(next, INTERVAL);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    // Dot click
    dots.forEach((d, i) =>
      d.addEventListener('click', () => {
        go(i);
        start();
      })
    );

    // Pause on hidden tab
    document.addEventListener('visibilitychange', () => {
      document.hidden ? stop() : start();
    });

    go(0);
    start();
  }

  /* =============================================================
     LIGHTBOX — for gallery images and any [data-lightbox] elements
     ============================================================= */
  function initLightbox() {
    // Support both auto-attach on .gallery-item img and [data-lightbox] links
    const triggers = document.querySelectorAll(
      '.gallery-item img, [data-lightbox] img, .gallery-masonry .gallery-item img'
    );
    if (!triggers.length) return;

    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML = `
      <button class="lightbox-close" aria-label="Close viewer">✕</button>
      <button class="lightbox-prev" aria-label="Previous image">‹</button>
      <button class="lightbox-next" aria-label="Next image">›</button>
      <img class="lightbox-img" alt="" />
    `;
    document.body.appendChild(lb);

    const imgEl = lb.querySelector('.lightbox-img');
    const list = Array.from(triggers);
    let currentIndex = 0;

    const open = (k) => {
      currentIndex = (k + list.length) % list.length;
      const src = list[currentIndex].src || list[currentIndex].getAttribute('data-src');
      const alt = list[currentIndex].alt || '';
      imgEl.src = src;
      imgEl.alt = alt;
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      lb.classList.remove('open');
      document.body.style.overflow = '';
    };

    const step = (delta) => open(currentIndex + delta);

    // Attach triggers
    list.forEach((img, k) => {
      const parent = img.parentElement;
      if (!parent) return;

      // Make the container keyboard-accessible
      parent.style.cursor = 'zoom-in';
      parent.setAttribute('tabindex', '0');
      parent.setAttribute('role', 'button');
      parent.setAttribute('aria-label', `View image ${k + 1}`);

      parent.addEventListener('click', (e) => {
        e.preventDefault();
        open(k);
      });

      parent.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(k);
        }
      });
    });

    // Controls
    lb.querySelector('.lightbox-close').addEventListener('click', close);
    lb.querySelector('.lightbox-prev').addEventListener('click', () => step(-1));
    lb.querySelector('.lightbox-next').addEventListener('click', () => step(1));

    // Click outside to close
    lb.addEventListener('click', (e) => {
      if (e.target === lb) close();
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
  }

  /* =============================================================
     SCROLL-TO-TOP BUTTON
     - Appears after 400px of scroll
     - Smooth-scrolls to top on click
     - Circular progress ring shows scroll percentage
     - Respects prefers-reduced-motion
     ============================================================= */
  function initScrollTop() {
    if (document.getElementById('scrollTopBtn')) return; // already exists

    const btn = document.createElement('button');
    btn.id = 'scrollTopBtn';
    btn.className = 'scroll-top-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.setAttribute('title', 'Back to top');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
      <span class="scroll-top-progress" aria-hidden="true"></span>
    `;
    document.body.appendChild(btn);

    const progress = btn.querySelector('.scroll-top-progress');

    const update = () => {
      const scrolled = window.scrollY;
      const threshold = 400;

      btn.classList.toggle('visible', scrolled > threshold);

      // Scroll percentage for the progress ring
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrolled / docHeight) * 100) : 0;
      if (progress) progress.style.setProperty('--progress', `${pct}%`);
    };

    const scrollToTop = () => {
      const prefersReduced = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      window.scrollTo({
        top: 0,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    };

    // Throttle scroll handler with rAF for performance
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            update();
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );

    btn.addEventListener('click', scrollToTop);

    // Keyboard support
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToTop();
      }
    });

    // Initial state
    update();
  }

  /* =============================================================
     HERO SCROLL CUE — hides after user scrolls
     ============================================================= */
  function initHeroScrollCue() {
    const cue = document.querySelector('.hero-scroll');
    if (!cue) return;

    const onScroll = () => {
      cue.style.opacity = window.scrollY > 120 ? '0' : '0.75';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* =============================================================
     SMOOTH ANCHOR SCROLLING (in-page #hash links)
     ============================================================= */
  function initSmoothAnchors() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (href === '#' || href.length < 2) return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const offset = 100; // account for fixed navbar
      const top =
        target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({
        top,
        behavior: prefersReduced ? 'auto' : 'smooth',
      });
    });
  }

  /* =============================================================
     LAZY IMAGE FALLBACK — replaces broken images with a placeholder
     ============================================================= */
  function initImageFallback() {
    const fallback =
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23142b48%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%23c9a961%22 font-family=%22Georgia%22 font-size=%2220%22 text-anchor=%22middle%22 dy=%22.35em%22%3EThe Kelvin Ikpeni Grand%3C/text%3E%3C/svg%3E';

    document.querySelectorAll('img').forEach((img) => {
      img.addEventListener(
        'error',
        () => {
          if (img.src !== fallback) img.src = fallback;
        },
        { once: true }
      );
    });
  }

  /* =============================================================
     NEWSLETTER (fallback for pages that include a newsletter form)
     ============================================================= */
  function initNewsletterFallback() {
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const consentInput = document.getElementById('newsletterConsent');
      const status = document.getElementById('newsletterStatus');

      const email = (emailInput?.value || '').trim();
      const consent = consentInput?.checked !== false;

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        if (status) {
          status.className = 'newsletter-status error';
          status.textContent = 'Please enter a valid email address.';
        }
        return;
      }

      try {
        const res = await apiRequest('/newsletter', {
          method: 'POST',
          body: JSON.stringify({ email, consent, source: 'homepage' }),
        });
        if (status) {
          status.className = 'newsletter-status success';
          status.textContent = res.message || 'Thank you for subscribing!';
        }
        form.reset();
      } catch (err) {
        if (status) {
          status.className = 'newsletter-status error';
          status.textContent = err.message || 'Unable to subscribe right now.';
        }
      }
    });
  }

  /* =============================================================
     BOOT — run on DOM ready
     ============================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initReveal();
    initHeroSlider();
    initLightbox();
    initScrollTop();
    initHeroScrollCue();
    initSmoothAnchors();
    initImageFallback();
    initNewsletterFallback();
  });

  /* =============================================================
     GLOBAL EXPORTS — for inline scripts on individual pages
     ============================================================= */
  window.apiRequest = apiRequest;
  window.showToast = showToast;
  window.formatCurrency = formatCurrency;
  window.formatDate = formatDate;
  window.escapeHtml = escapeHtml;
})();