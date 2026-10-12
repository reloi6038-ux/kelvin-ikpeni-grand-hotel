/* =============================================================
   THE KELVIN IKPENI GRAND HOTEL — Booking Page JavaScript
   =============================================================
   Features:
   - Fetch rooms from /api/rooms
   - Room picker with selection + availability
   - Date pickers with validation (check-out > check-in)
   - Guest / room counters
   - Live price breakdown (subtotal + 5% service + 7.5% VAT)
   - Step indicator (1 - 2 - 3)
   - Form validation
   - Submit to /api/bookings
   - Enhanced confirmation modal with:
       * Guest first name
       * Confirmation email note
       * Booking reference + copy-to-clipboard
       * Full breakdown (room, dates, nights, guests, total)
       * "What happens next?" note
       * Auto-dismiss after 30 seconds
   - Deep-link support: ?room=id&checkIn=...&checkOut=...
   ============================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------------
     CONSTANTS
     ------------------------------------------------------------- */
  const TAX_RATE = 0.075;       // 7.5% VAT (Nigeria)
  const SERVICE_RATE = 0.05;    // 5% service charge
  const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80';
  const MODAL_AUTOCLOSE_MS = 30000; // 30 seconds

  /* -------------------------------------------------------------
     STATE
     ------------------------------------------------------------- */
  const state = {
    rooms: [],
    selectedRoom: null,
    nights: 0,
    breakdown: { subtotal: 0, service: 0, tax: 0 },
    total: 0,
  };

  let modalAutoCloseTimer = null;

  /* -------------------------------------------------------------
     SHORTHANDS
     ------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const el = (sel, root = document) => root.querySelector(sel);
  const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* -------------------------------------------------------------
     API WRAPPER
     ------------------------------------------------------------- */
  async function api(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    const res = await fetch(`/api${endpoint}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* -------------------------------------------------------------
     UTILITIES
     ------------------------------------------------------------- */
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );

  const formatCurrency = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

  const formatDate = (d) =>
    !d
      ? '—'
      : new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

  const toISO = (d) => new Date(d).toISOString().split('T')[0];

  /* =============================================================
     DATE DEFAULTS
     ============================================================= */
  function setDateDefaults() {
    const ci = $('checkIn');
    const co = $('checkOut');
    if (!ci || !co) return;

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);
    const dayAfter = new Date(today.getTime() + 2 * 86400000);

    const todayStr = toISO(today);
    const tomorrowStr = toISO(tomorrow);
    const dayAfterStr = toISO(dayAfter);

    ci.min = todayStr;
    co.min = tomorrowStr;

    if (!ci.value) ci.value = tomorrowStr;
    if (!co.value) co.value = dayAfterStr;

    // Ensure checkout is after checkin
    if (co.value <= ci.value) {
      const newCo = new Date(ci.value);
      newCo.setDate(newCo.getDate() + 1);
      co.value = toISO(newCo);
    }
  }

  /* =============================================================
     LOAD & RENDER ROOMS
     ============================================================= */
  async function loadRooms() {
    const picker = $('roomPicker');
    const errBox = $('roomPickerError');
    if (!picker) return;

    try {
      const { rooms } = await api('/rooms');
      state.rooms = (rooms || []).filter((r) => r.isActive !== false);

      if (!state.rooms.length) {
        picker.innerHTML = `
          <div class="bk-alert bk-alert-info" style="grid-column:1/-1;text-align:center">
            No rooms are currently available. Please check back shortly or
            <a href="/contact.html" style="color:var(--gold-500)">contact us</a>.
          </div>`;
        return;
      }

      renderRoomPicker();
    } catch (err) {
      if (errBox) {
        errBox.textContent =
          err.message || 'Unable to load rooms. Please refresh the page.';
        errBox.classList.remove('hidden');
      }
      picker.innerHTML = '';
    }
  }

  function renderRoomPicker() {
    const picker = $('roomPicker');
    picker.innerHTML = state.rooms.map(roomCardTemplate).join('');

    els('.bk-picker-card', picker).forEach((card) => {
      const id = card.getAttribute('data-room-id');
      const handler = () => selectRoom(id);

      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });

      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
    });
  }

  function roomCardTemplate(r) {
    const img = (r.images && r.images[0]) || FALLBACK_IMAGE;
    return `
      <div class="bk-picker-card" data-room-id="${r._id}" aria-label="Select ${esc(r.name)}">
        <img class="bk-picker-img" src="${esc(img)}" alt="${esc(r.name)}" loading="lazy" />
        <span class="bk-picker-type">${esc(r.type || 'Room')}</span>
        <h3 class="bk-picker-name">${esc(r.name)}</h3>
        <div class="bk-picker-meta">
          <span>👥 ${r.capacity || 2} Guests</span>
          <span>🛏 ${esc(r.beds || '1 King Bed')}</span>
        </div>
        <div class="bk-picker-price">
          ${formatCurrency(r.price)}<small>/night</small>
        </div>
      </div>`;
  }

  /* =============================================================
     ROOM SELECTION
     ============================================================= */
  function selectRoom(id) {
    const room = state.rooms.find((r) => r._id === id);
    if (!room) return;

    state.selectedRoom = room;

    els('.bk-picker-card').forEach((card) => {
      card.classList.toggle('selected', card.getAttribute('data-room-id') === id);
    });

    // Auto-adjust adults if room capacity is smaller
    const adultsInput = $('adults');
    if (adultsInput) {
      const cap = Number(room.capacity) || 2;
      if (Number(adultsInput.value) > cap) adultsInput.value = cap;
      adultsInput.max = Math.max(cap, 1);
    }

    // Scroll summary into view on mobile
    if (window.innerWidth <= 1000) {
      setTimeout(() => {
        $('bookingSummary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }

    markStepComplete(1);
    recalculate();
  }

  /* =============================================================
     DATE PICKERS
     ============================================================= */
  function wireDatePickers() {
    const ci = $('checkIn');
    const co = $('checkOut');
    if (!ci || !co) return;

    ci.addEventListener('change', () => {
      const next = new Date(ci.value);
      next.setDate(next.getDate() + 1);
      co.min = toISO(next);

      if (!co.value || co.value <= ci.value) {
        co.value = toISO(next);
      }
      recalculate();
    });

    co.addEventListener('change', recalculate);
  }

  /* =============================================================
     COUNTERS (adults, children, rooms)
     ============================================================= */
  function wireCounters() {
    els('[data-counter]').forEach((wrap) => {
      const input = el('input', wrap);
      const minus = el('[data-action="minus"]', wrap);
      const plus = el('[data-action="plus"]', wrap);

      const update = (delta) => {
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 99;
        let v = Number(input.value) + delta;
        v = Math.max(min, Math.min(max, v));
        input.value = v;
        refreshCounterButtons(wrap);
        recalculate();
      };

      minus?.addEventListener('click', () => update(-1));
      plus?.addEventListener('click', () => update(1));

      refreshCounterButtons(wrap);
    });
  }

  function refreshCounterButtons(wrap) {
    const input = el('input', wrap);
    const minus = el('[data-action="minus"]', wrap);
    const plus = el('[data-action="plus"]', wrap);
    if (!input) return;

    const min = Number(input.min) || 0;
    const max = Number(input.max) || 99;
    const v = Number(input.value);
    if (minus) minus.disabled = v <= min;
    if (plus) plus.disabled = v >= max;
  }

  /* =============================================================
     SPECIAL REQUESTS COUNTER
     ============================================================= */
  function wireSpecialRequestsCounter() {
    const field = $('specialRequests');
    const counter = $('srCount');
    if (!field || !counter) return;

    const update = () => {
      counter.textContent = field.value.length;
    };
    field.addEventListener('input', update);
    update();
  }

  /* =============================================================
     RECALCULATE & RENDER SUMMARY
     ============================================================= */
  function recalculate() {
    const ci = $('checkIn')?.value;
    const co = $('checkOut')?.value;
    const roomsCount = Number($('rooms')?.value || 1);
    const adults = Number($('adults')?.value || 2);
    const children = Number($('children')?.value || 0);
    const room = state.selectedRoom;

    const nightsBadge = $('nightsBadge');
    const nightsText = $('nightsText');

    if (!room || !ci || !co || ci >= co) {
      state.nights = 0;
      state.breakdown = { subtotal: 0, service: 0, tax: 0 };
      state.total = 0;
      nightsBadge?.classList.add('hidden');
      renderSummary();
      return;
    }

    const nights = Math.max(
      1,
      Math.round((new Date(co) - new Date(ci)) / 86400000)
    );
    const subtotal = room.price * nights * roomsCount;
    const service = subtotal * SERVICE_RATE;
    const tax = subtotal * TAX_RATE;

    state.nights = nights;
    state.breakdown = { subtotal, service, tax };
    state.total = subtotal + service + tax;

    if (nightsBadge && nightsText) {
      nightsText.textContent = `${nights} night${nights === 1 ? '' : 's'} · ${adults} adult${adults === 1 ? '' : 's'}${
        children ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''
      } · ${roomsCount} room${roomsCount === 1 ? '' : 's'}`;
      nightsBadge.classList.remove('hidden');
    }

    renderSummary();
    updateSteps();
  }

  function renderSummary() {
    const box = $('bookingSummary');
    if (!box) return;

    const room = state.selectedRoom;
    const ci = $('checkIn')?.value;
    const co = $('checkOut')?.value;
    const roomsCount = Number($('rooms')?.value || 1);
    const adults = Number($('adults')?.value || 2);
    const children = Number($('children')?.value || 0);

    if (!room || !ci || !co || state.nights < 1) {
      box.innerHTML = `
        <h3>Your Reservation</h3>
        <p class="bk-summary-empty">
          Select a room and your dates above, and your reservation summary will appear here.
        </p>`;
      return;
    }

    const img = (room.images && room.images[0]) || FALLBACK_IMAGE;

    box.innerHTML = `
      <h3>Your Reservation</h3>
      <div class="bk-summary-preview">
        <span class="bk-summary-room-type">${esc(room.type || 'Room')}</span>
        <img src="${esc(img)}" alt="${esc(room.name)}" />
      </div>
      <p class="bk-summary-room-name">${esc(room.name)}</p>

      <div class="bk-summary-rows">
        <div class="bk-summary-row"><span>Check-In</span><span>${formatDate(ci)}</span></div>
        <div class="bk-summary-row"><span>Check-Out</span><span>${formatDate(co)}</span></div>
        <div class="bk-summary-row"><span>Nights</span><span>${state.nights}</span></div>
        <div class="bk-summary-row"><span>Guests</span><span>${adults} adult${adults === 1 ? '' : 's'}${
          children ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''
        }</span></div>
        <div class="bk-summary-row"><span>Rooms</span><span>${roomsCount}</span></div>
      </div>

      <div class="bk-summary-divider"></div>

      <div class="bk-summary-line-item">
        <span>${formatCurrency(room.price)} × ${state.nights} night${state.nights === 1 ? '' : 's'} × ${roomsCount} room${roomsCount === 1 ? '' : 's'}</span>
        <span>${formatCurrency(state.breakdown.subtotal)}</span>
      </div>
      <div class="bk-summary-line-item">
        <span>Service Charge (5%)</span>
        <span>${formatCurrency(state.breakdown.service)}</span>
      </div>
      <div class="bk-summary-line-item">
        <span>VAT (7.5%)</span>
        <span>${formatCurrency(state.breakdown.tax)}</span>
      </div>

      <div class="bk-summary-total">
        <span class="bk-summary-total-label">Total</span>
        <span class="bk-summary-total-amount">${formatCurrency(state.total)}</span>
      </div>

      <p class="bk-summary-note">
        No payment required now.<br/>Our team will contact you to confirm.
      </p>`;
  }

  /* =============================================================
     STEP INDICATOR
     ============================================================= */
  function updateSteps() {
    const step1 = state.selectedRoom ? 'completed' : 'active';
    const step2 =
      state.selectedRoom && state.nights >= 1
        ? 'completed'
        : state.selectedRoom
        ? 'active'
        : '';
    const step3 =
      state.selectedRoom && state.nights >= 1 ? 'active' : '';
    setStep(1, step1);
    setStep(2, step2);
    setStep(3, step3);
  }

  function setStep(n, cls) {
    const stepEl = document.querySelector(`.bk-step[data-step="${n}"]`);
    if (!stepEl) return;
    stepEl.classList.remove('active', 'completed');
    if (cls) stepEl.classList.add(cls);
  }

  function markStepComplete(n) {
    const step = document.querySelector(`.bk-step[data-step="${n}"]`);
    if (step) {
      step.classList.remove('active');
      step.classList.add('completed');
    }
    const next = document.querySelector(`.bk-step[data-step="${n + 1}"]`);
    if (next) next.classList.add('active');
  }

  /* =============================================================
     SUBMIT
     ============================================================= */
  function wireSubmit() {
    const form = $('bookingForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = $('bookingAlert');
      if (alertBox) alertBox.innerHTML = '';

      const ci = $('checkIn').value;
      const co = $('checkOut').value;
      const name = $('guestName').value.trim();
      const email = $('guestEmail').value.trim();
      const phone = $('guestPhone').value.trim();
      const consent = $('bookingConsent').checked;
      const sr = $('specialRequests').value.trim();

      const errors = [];
      if (!state.selectedRoom) errors.push('Please select a room.');
      if (!ci) errors.push('Please choose a check-in date.');
      if (!co) errors.push('Please choose a check-out date.');
      if (ci && co && ci >= co) errors.push('Check-out must be after check-in.');
      if (name.length < 2) errors.push('Please enter your full name.');
      if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('Please enter a valid email address.');
      if (phone.replace(/\D/g, '').length < 7)
        errors.push('Please enter a valid phone number.');
      if (!consent) errors.push('Please confirm your booking details.');

      if (errors.length) {
        showAlert(errors.map((x) => `• ${x}`).join('<br/>'), 'error');
        return;
      }

      const btn = $('submitBtn');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span>Processing…</span>';

      const payload = {
        guestName: name,
        email,
        phone,
        roomId: state.selectedRoom._id,
        checkIn: ci,
        checkOut: co,
        guests: Number($('adults').value) + Number($('children').value),
        rooms: Number($('rooms').value),
        specialRequests: sr,
      };

      try {
        const res = await api('/bookings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showConfirmation(res.booking, { email, name });
        resetForm();
      } catch (err) {
        showAlert(
          err.message || 'We could not complete your booking. Please try again.',
          'error'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }
    });
  }

  function showAlert(msg, type) {
    const box = $('bookingAlert');
    if (!box) return;
    box.innerHTML = `<div class="bk-alert bk-alert-${type}">${msg}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* =============================================================
     CONFIRMATION MODAL — Enhanced
     ============================================================= */
  function showConfirmation(booking, ctx = {}) {
    let modal = $('bookingModal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'bookingModal';
      modal.className = 'bk-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'bkConfTitle');
      modal.innerHTML = `
        <div class="bk-modal-inner">
          <button type="button" class="bk-modal-close" id="bkConfX" aria-label="Close">✕</button>

          <div class="bk-modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>

          <h2 id="bkConfTitle">Reservation Confirmed</h2>

          <p class="bk-modal-lead">
            Thank you, <strong id="bkConfName">Guest</strong>.
            Your reservation has been received — a confirmation email has been sent to
            <strong id="bkConfEmail">your inbox</strong>.
          </p>

          <div class="bk-modal-ref-block">
            <span class="bk-modal-ref-label">Booking Reference</span>
            <div class="bk-modal-ref-wrap">
              <span class="bk-modal-ref" id="bkConfRef">KIGH-000000-0000</span>
              <button type="button" class="bk-modal-copy" id="bkConfCopy" aria-label="Copy booking reference">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                <span>Copy</span>
              </button>
            </div>
          </div>

          <div class="bk-modal-detail">
            <div class="row"><span class="lbl">Room</span><span class="val" id="bkConfRoom"></span></div>
            <div class="row"><span class="lbl">Check-In</span><span class="val" id="bkConfCI"></span></div>
            <div class="row"><span class="lbl">Check-Out</span><span class="val" id="bkConfCO"></span></div>
            <div class="row"><span class="lbl">Nights</span><span class="val" id="bkConfNights"></span></div>
            <div class="row"><span class="lbl">Guests</span><span class="val" id="bkConfGuests"></span></div>
            <div class="row bk-modal-total-row"><span class="lbl">Total</span><span class="val" id="bkConfTotal"></span></div>
          </div>

          <p class="bk-modal-note">
            <strong>What happens next?</strong>
            Our reservations team will contact you shortly to confirm payment and finalise any special requests.
          </p>

          <div class="bk-modal-actions">
            <button type="button" class="bk-btn bk-btn-primary" id="bkConfClose">Done</button>
            <a href="/" class="bk-btn bk-btn-outline">Return Home</a>
          </div>
        </div>`;
      document.body.appendChild(modal);

      // Wire close buttons
      modal.querySelector('#bkConfClose').addEventListener('click', closeConfirmation);
      modal.querySelector('#bkConfX').addEventListener('click', closeConfirmation);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeConfirmation();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) closeConfirmation();
      });

      // Wire copy button
      modal.querySelector('#bkConfCopy').addEventListener('click', async () => {
        const ref = ($('bkConfRef')?.textContent || '').trim();
        if (!ref) return;
        const btn = $('bkConfCopy');
        const original = btn.innerHTML;

        const success = async () => {
          btn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg><span>Copied</span>';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('copied');
          }, 2000);
        };

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(ref);
            success();
          } else {
            const ta = document.createElement('textarea');
            ta.value = ref;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            success();
          }
        } catch {
          // Silently ignore — user can manually select & copy
        }
      });
    }

    // Populate fields
    const fullName = booking.guestName || ctx.name || '';
    const firstName = fullName.split(' ')[0] || 'Guest';
    const email = booking.email || ctx.email || '';

    $('bkConfName').textContent = firstName;
    $('bkConfEmail').textContent = email || 'your inbox';
    $('bkConfRef').textContent = booking.bookingId || '—';
    $('bkConfRoom').textContent = booking.roomName || state.selectedRoom?.name || '—';
    $('bkConfCI').textContent = formatDate(booking.checkIn);
    $('bkConfCO').textContent = formatDate(booking.checkOut);
    $('bkConfNights').textContent = booking.nights || state.nights || '—';
    $('bkConfGuests').textContent = booking.guests || '—';
    $('bkConfTotal').textContent = formatCurrency(booking.totalPrice || state.total);

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Focus the Done button for accessibility
    setTimeout(() => $('bkConfClose')?.focus(), 150);

    // Auto-dismiss after MODAL_AUTOCLOSE_MS
    clearTimeout(modalAutoCloseTimer);
    modalAutoCloseTimer = setTimeout(() => {
      if (modal.classList.contains('open')) closeConfirmation();
    }, MODAL_AUTOCLOSE_MS);
  }

  function closeConfirmation() {
    clearTimeout(modalAutoCloseTimer);
    modalAutoCloseTimer = null;
    const modal = $('bookingModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function resetForm() {
    const form = $('bookingForm');
    if (!form) return;
    form.reset();
    state.selectedRoom = null;
    state.nights = 0;
    state.total = 0;
    state.breakdown = { subtotal: 0, service: 0, tax: 0 };

    els('.bk-picker-card').forEach((c) => c.classList.remove('selected'));
    els('[data-counter]').forEach(refreshCounterButtons);

    setDateDefaults();
    updateSteps();
    renderSummary();

    const counter = $('srCount');
    if (counter) counter.textContent = '0';
  }

  /* =============================================================
     DEEP LINK SUPPORT
     ============================================================= */
  function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    const ci = params.get('checkIn');
    const co = params.get('checkOut');
    const adults = params.get('adults');
    const children = params.get('children');
    const rooms = params.get('rooms');

    if (ci) $('checkIn').value = ci;
    if (co) $('checkOut').value = co;
    if (adults) $('adults').value = adults;
    if (children) $('children').value = children;
    if (rooms) $('rooms').value = rooms;

    if (roomId) {
      const exists = state.rooms.some((r) => r._id === roomId);
      if (exists) selectRoom(roomId);
    }

    recalculate();
  }

  /* =============================================================
     BOOT
     ============================================================= */
  document.addEventListener('DOMContentLoaded', async () => {
    setDateDefaults();
    wireDatePickers();
    wireCounters();
    wireSpecialRequestsCounter();
    wireSubmit();
    renderSummary();
    updateSteps();

    await loadRooms();
    handleDeepLink();
  });
})();