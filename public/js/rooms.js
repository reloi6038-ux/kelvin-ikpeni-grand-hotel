/* =============================================================
   Rooms page — filters, listing, detail modal, deep-link support
   ============================================================= */

(function () {
  'use strict';

  const state = {
    allRooms: [],
    filtered: [],
    filters: { type: '', guests: 0, minPrice: '', maxPrice: '' },
    activeRoom: null,
    activeImageIndex: 0,
  };

  /* ---------------- Fetch + render ---------------- */
  async function loadRooms() {
    const grid = document.getElementById('roomsGrid');
    if (!grid) return;
    try {
      const { rooms } = await apiRequest('/rooms');
      state.allRooms = rooms || [];
      applyFilters();

      // Deep link: /rooms.html?room=ID or ?type=Suite
      const params = new URLSearchParams(window.location.search);
      const roomId = params.get('room');
      if (roomId) {
        const room = state.allRooms.find((r) => r._id === roomId);
        if (room) openRoomModal(room);
      }
      const typeParam = params.get('type');
      if (typeParam) {
        const chip = document.querySelector(`.filter-chip[data-type="${typeParam}"]`);
        if (chip) chip.click();
      }
    } catch (err) {
      grid.innerHTML = renderEmptyState(
        'Unable to load rooms',
        'We could not connect to our reservation system. Please try again in a moment.'
      );
    }
  }

  function applyFilters() {
    const { type, guests, minPrice, maxPrice } = state.filters;
    let list = [...state.allRooms];
    if (type) list = list.filter((r) => r.type === type);
    if (guests) list = list.filter((r) => (r.capacity || 0) >= Number(guests));
    if (minPrice) list = list.filter((r) => r.price >= Number(minPrice));
    if (maxPrice) list = list.filter((r) => r.price <= Number(maxPrice));
    state.filtered = list;
    renderRooms();
  }

  function renderRooms() {
    const grid = document.getElementById('roomsGrid');
    const countEl = document.getElementById('roomsCount');
    if (countEl) {
      countEl.textContent = `${state.filtered.length} room${state.filtered.length === 1 ? '' : 's'} available`;
    }

    if (!state.filtered.length) {
      grid.innerHTML = renderEmptyState(
        'No rooms match your filters',
        'Try adjusting your search criteria or clear all filters to see every room.'
      );
      return;
    }

    grid.innerHTML = state.filtered.map(roomCardTemplate).join('');
    grid.querySelectorAll('.room-card').forEach((card) => {
      const id = card.getAttribute('data-room-id');
      card.querySelector('.btn-view')?.addEventListener('click', (e) => {
        e.preventDefault();
        const room = state.allRooms.find((r) => r._id === id);
        if (room) openRoomModal(room);
      });
    });
  }

  function roomCardTemplate(room) {
    const img =
      (room.images && room.images[0]) ||
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1000&q=80';
    const desc =
      room.shortDescription ||
      (room.description ? room.description.slice(0, 130) + '…' : '');
    const amenities = (room.amenities || []).slice(0, 3);

    return `
      <article class="room-card" data-room-id="${room._id}">
        <div class="room-media">
          <span class="room-tag">${esc(room.type || 'Room')}</span>
          <img src="${esc(img)}" alt="${esc(room.name)}" loading="lazy" />
        </div>
        <div class="room-body">
          <h3>${esc(room.name)}</h3>
          <p class="room-desc">${esc(desc)}</p>
          <div class="room-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3"/><path d="M5 21c0-3.5 3.5-5 7-5s7 1.5 7 5"/></svg>
              ${room.capacity || 2} Guests
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M6 10V6h12v4"/></svg>
              ${esc(room.beds || '1 King Bed')}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4z"/></svg>
              ${esc(room.size || '45 sqm')}
            </span>
          </div>
          ${
            amenities.length
              ? `<div class="room-modal-amenities" style="margin-bottom:18px">${amenities
                  .map((a) => `<span>${esc(a)}</span>`)
                  .join('')}</div>`
              : ''
          }
          <div class="room-footer">
            <div class="room-price">
              <span class="amt">${formatCurrency(room.price)}</span>
              <span class="unit">per night</span>
            </div>
            <div style="display:flex;gap:10px">
              <button type="button" class="btn btn-sm btn-outline btn-view">Details</button>
              <a href="/booking.html?room=${room._id}" class="btn btn-sm btn-gold-outline">Reserve</a>
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderEmptyState(title, message) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
      </div>`;
  }

  /* ---------------- Room detail modal ---------------- */
  function buildModal() {
    if (document.getElementById('roomModal')) return;
    const modal = document.createElement('div');
    modal.className = 'room-modal';
    modal.id = 'roomModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="room-modal-inner" style="position:relative">
        <button class="room-modal-close" aria-label="Close details">✕</button>
        <div class="room-modal-gallery">
          <img id="modalImage" alt="" />
          <div class="room-modal-nav" id="modalNav"></div>
        </div>
        <div class="room-modal-body">
          <div>
            <span class="room-modal-type" id="modalType"></span>
            <h2 id="modalName"></h2>
            <p class="room-modal-desc" id="modalDesc"></p>
            <div class="room-modal-specs" id="modalSpecs"></div>
            <h4 style="font-family:var(--font-display);font-size:1.05rem;color:var(--white);margin-bottom:14px">Amenities</h4>
            <div class="room-modal-amenities" id="modalAmenities"></div>
          </div>
          <div class="room-modal-side">
            <div class="room-modal-price">
              <span class="amt" id="modalPrice"></span>
              <span class="unit">per night</span>
              <a href="#" class="btn btn-primary" id="modalBook">Reserve This Room</a>
            </div>
            <div style="font-family:var(--font-sans);font-size:0.82rem;color:var(--text-muted);line-height:1.7">
              <strong style="color:var(--gold-500);display:block;margin-bottom:8px">Included with every stay</strong>
              Complimentary breakfast · High-speed Wi-Fi · Airport transfer on request · Access to spa & pool
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('.room-modal-close').addEventListener('click', closeRoomModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeRoomModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeRoomModal();
    });
  }

  function openRoomModal(room) {
    buildModal();
    state.activeRoom = room;
    state.activeImageIndex = 0;

    const modal = document.getElementById('roomModal');
    modal.querySelector('#modalType').textContent = room.type || 'Room';
    modal.querySelector('#modalName').textContent = room.name;
    modal.querySelector('#modalDesc').textContent = room.description || '';
    modal.querySelector('#modalPrice').textContent = formatCurrency(room.price);
    modal.querySelector('#modalBook').href = `/booking.html?room=${room._id}`;

    modal.querySelector('#modalSpecs').innerHTML = `
      <div class="spec"><span class="spec-label">Capacity</span><span class="spec-value">${room.capacity || 2} Guests</span></div>
      <div class="spec"><span class="spec-label">Bed</span><span class="spec-value">${esc(room.beds || '1 King Bed')}</span></div>
      <div class="spec"><span class="spec-label">Size</span><span class="spec-value">${esc(room.size || '45 sqm')}</span></div>
      <div class="spec"><span class="spec-label">Rating</span><span class="spec-value">★★★★★</span></div>`;

    const amenities = room.amenities || [];
    modal.querySelector('#modalAmenities').innerHTML = amenities.length
      ? amenities.map((a) => `<span>${esc(a)}</span>`).join('')
      : '<span>Standard five-star amenities</span>';

    renderModalImage();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function renderModalImage() {
    const room = state.activeRoom;
    if (!room) return;
    const images =
      room.images && room.images.length
        ? room.images
        : ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80'];
    const idx = Math.min(state.activeImageIndex, images.length - 1);

    const imgEl = document.getElementById('modalImage');
    imgEl.src = images[idx];
    imgEl.alt = `${room.name} — image ${idx + 1}`;

    const nav = document.getElementById('modalNav');
    if (images.length > 1) {
      nav.innerHTML = images
        .map(
          (src, i) =>
            `<div class="room-modal-dot ${i === idx ? 'active' : ''}" data-index="${i}"><img src="${esc(src)}" alt="" /></div>`
        )
        .join('');
      nav.querySelectorAll('.room-modal-dot').forEach((dot) => {
        dot.addEventListener('click', () => {
          state.activeImageIndex = Number(dot.getAttribute('data-index'));
          renderModalImage();
        });
      });
      nav.style.display = 'flex';
    } else {
      nav.style.display = 'none';
    }
  }

  function closeRoomModal() {
    const modal = document.getElementById('roomModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ---------------- Filter wiring ---------------- */
  function initFilters() {
    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.filters.type = chip.getAttribute('data-type') || '';
        applyFilters();
      });
    });

    const guestsInput = document.getElementById('filterGuests');
    const minInput = document.getElementById('filterMinPrice');
    const maxInput = document.getElementById('filterMaxPrice');
    const clearBtn = document.getElementById('clearFilters');

    const debounce = (fn, ms = 350) => {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
      };
    };

    if (guestsInput) {
      guestsInput.addEventListener(
        'input',
        debounce(() => {
          state.filters.guests = Number(guestsInput.value) || 0;
          applyFilters();
        })
      );
    }
    if (minInput) {
      minInput.addEventListener(
        'input',
        debounce(() => {
          state.filters.minPrice = minInput.value;
          applyFilters();
        })
      );
    }
    if (maxInput) {
      maxInput.addEventListener(
        'input',
        debounce(() => {
          state.filters.maxPrice = maxInput.value;
          applyFilters();
        })
      );
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.filters = { type: '', guests: 0, minPrice: '', maxPrice: '' };
        document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
        document.querySelector('.filter-chip[data-type=""]')?.classList.add('active');
        if (guestsInput) guestsInput.value = '';
        if (minInput) minInput.value = '';
        if (maxInput) maxInput.value = '';
        applyFilters();
      });
    }
  }

  /* ---------------- Helpers ---------------- */
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initFilters();
    loadRooms();
  });
})();