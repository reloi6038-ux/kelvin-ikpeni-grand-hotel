/* =============================================================
   Gallery page — masonry grid, category filters, lightbox
   ============================================================= */

(function () {
  'use strict';

  const GALLERY_IMAGES = [
    { src: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&q=80', category: 'rooms', title: 'Deluxe King Room', caption: 'City view' },
    { src: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&q=80', category: 'rooms', title: 'Executive Suite', caption: 'Living area' },
    { src: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80', category: 'rooms', title: 'Presidential Suite', caption: 'Master bedroom' },
    { src: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80', category: 'rooms', title: 'Grand Suite', caption: 'Dining area' },

    { src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80', category: 'dining', title: 'Signature Dish', caption: 'Grand Restaurant' },
    { src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80', category: 'dining', title: 'Grand Restaurant', caption: 'Fine dining room' },
    { src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1200&q=80', category: 'dining', title: 'Sky Terrace Lounge', caption: 'Rooftop cocktails' },

    { src: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80', category: 'spa', title: 'Serenity Spa', caption: 'Treatment suite' },
    { src: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=1200&q=80', category: 'spa', title: 'Relaxation Lounge', caption: 'Quiet space' },

    { src: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80', category: 'facilities', title: 'Rooftop Pool', caption: 'Infinity edge' },
    { src: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80', category: 'facilities', title: 'Grand Lobby', caption: 'Arrival experience' },
    { src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', category: 'facilities', title: 'Hotel Exterior', caption: 'Victoria Island' },
    { src: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80', category: 'facilities', title: 'Conference Suite', caption: 'Event venue' },
    { src: 'https://images.unsplash.com/photo-1568495248636-6432b97bd949?w=1200&q=80', category: 'facilities', title: 'Fitness Centre', caption: '24-hour gym' },
    { src: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&q=80', category: 'facilities', title: 'Wellness Studio', caption: 'Yoga & meditation' },
  ];

  const state = { filter: 'all', images: [] };

  function renderGrid() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    const list = state.filter === 'all'
      ? GALLERY_IMAGES
      : GALLERY_IMAGES.filter((i) => i.category === state.filter);

    if (!list.length) {
      grid.innerHTML = '<div class="empty-state" style="columns:1"><h3>No images in this category</h3></div>';
      return;
    }

    grid.innerHTML = list
      .map(
        (img, i) => `
      <figure class="gallery-item" data-index="${GALLERY_IMAGES.indexOf(img)}" tabindex="0">
        <img src="${img.src}" alt="${img.title}" loading="lazy" />
        <figcaption class="gallery-caption">
          <h4>${img.title}</h4>
          <span>${img.caption}</span>
        </figcaption>
      </figure>`
      )
      .join('');

    grid.querySelectorAll('.gallery-item').forEach((item) => {
      const idx = Number(item.getAttribute('data-index'));
      item.addEventListener('click', () => openLightbox(idx));
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(idx);
        }
      });
    });
  }

  function initFilters() {
    document.querySelectorAll('.gallery-filters .filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.gallery-filters .filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.filter = chip.getAttribute('data-filter') || 'all';
        renderGrid();
      });
    });
  }

  /* ---------------- Lightbox ---------------- */
  let lightboxIndex = 0;

  function buildLightbox() {
    if (document.getElementById('galleryLightbox')) return;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.id = 'galleryLightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = `
      <button class="lightbox-close" aria-label="Close (Esc)">✕</button>
      <button class="lightbox-prev" aria-label="Previous (←)">‹</button>
      <button class="lightbox-next" aria-label="Next (→)">›</button>
      <img class="lightbox-img" alt="" />
    `;
    document.body.appendChild(lb);

    lb.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lb.querySelector('.lightbox-prev').addEventListener('click', () => step(-1));
    lb.querySelector('.lightbox-next').addEventListener('click', () => step(1));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });
  }

  function openLightbox(index) {
    buildLightbox();
    lightboxIndex = index;
    updateLightbox();
    document.getElementById('galleryLightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.getElementById('galleryLightbox');
    if (!lb) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
  }

  function step(delta) {
    const total = GALLERY_IMAGES.length;
    lightboxIndex = (lightboxIndex + delta + total) % total;
    updateLightbox();
  }

  function updateLightbox() {
    const lb = document.getElementById('galleryLightbox');
    if (!lb) return;
    const img = GALLERY_IMAGES[lightboxIndex];
    const imgEl = lb.querySelector('.lightbox-img');
    imgEl.src = img.src;
    imgEl.alt = img.title;
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    renderGrid();
  });
})();