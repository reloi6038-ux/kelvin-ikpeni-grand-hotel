/* =============================================================
   Homepage-specific behaviour: rooms, offers, availability,
   newsletter, testimonials carousel
   ============================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Year in footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Site info (populate contact if API returns)
  loadSiteInfo();

  // Featured rooms
  loadFeaturedRooms();

  // Offers
  loadOffers();

  // Availability form
  initAvailabilityForm();

  // Newsletter
  initNewsletterForm();

  // Testimonials carousel
  initTestimonials();
});

/* ---------------- Site info ---------------- */
async function loadSiteInfo() {
  try {
    const { siteInfo } = await apiRequest('/site-info');
    if (!siteInfo) return;
    const { address, phone, email } = siteInfo;
    const addr = document.getElementById('siteAddress');
    if (addr && address) {
      addr.textContent = `${address.street}, ${address.city}, ${address.country}`;
    }
    const ph = document.getElementById('sitePhone');
    if (ph && phone) {
      ph.textContent = phone;
      ph.href = `tel:${phone.replace(/\s+/g, '')}`;
    }
    const em = document.getElementById('siteEmail');
    if (em && email) {
      em.textContent = email;
      em.href = `mailto:${email}`;
    }
  } catch (_) {
    /* Silent — fall back to hardcoded */
  }
}

/* ---------------- Featured rooms ---------------- */
async function loadFeaturedRooms() {
  const container = document.getElementById('featuredRooms');
  if (!container) return;
  try {
    const { rooms } = await apiRequest('/rooms?featured=true');
    const list = rooms && rooms.length ? rooms : (await apiRequest('/rooms')).rooms || [];

    if (!list.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0">
          Room information is being updated. Please check back shortly or
          <a href="/contact.html">contact us</a> for details.
        </div>`;
      return;
    }

    container.innerHTML = list.slice(0, 3).map(roomCardTemplate).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0">
        Unable to load rooms right now. Please try again later.
      </div>`;
  }
}

function roomCardTemplate(r) {
  const img = (r.images && r.images[0]) || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1000&q=80';
  const desc = r.shortDescription || (r.description || '').slice(0, 130) + '…';
  const safe = (s) => String(s || '').replace(/[<>]/g, '');
  return `
    <article class="room-card">
      <div class="room-media">
        <span class="room-tag">${safe(r.type || 'Room')}</span>
        <img src="${img}" alt="${safe(r.name)}" loading="lazy" />
      </div>
      <div class="room-body">
        <h3>${safe(r.name)}</h3>
        <p class="room-desc">${safe(desc)}</p>
        <div class="room-meta">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3"/><path d="M5 21c0-3.5 3.5-5 7-5s7 1.5 7 5"/></svg>
            ${r.capacity || 2} Guests
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M6 10V6h12v4"/></svg>
            ${safe(r.beds || '1 King Bed')}
          </span>
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16v16H4z"/></svg>
            ${safe(r.size || '45 sqm')}
          </span>
        </div>
        <div class="room-footer">
          <div class="room-price">
            <span class="amt">${formatCurrency(r.price)}</span>
            <span class="unit">per night</span>
          </div>
          <a href="/booking.html?room=${r._id}" class="btn btn-sm btn-gold-outline">Reserve</a>
        </div>
      </div>
    </article>`;
}

/* ---------------- Offers ---------------- */
async function loadOffers() {
  const grid = document.getElementById('offersGrid');
  if (!grid) return;
  try {
    const { offers } = await apiRequest('/offers?featured=true');
    const list = offers && offers.length ? offers : (await apiRequest('/offers')).offers || [];

    if (!list.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px 0">
          Seasonal packages are being prepared. Subscribe to our newsletter to be the first to know.
        </div>`;
      return;
    }

    grid.innerHTML = list.slice(0, 3).map(offerCardTemplate).join('');
  } catch (err) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px 0">
        Unable to load offers right now.
      </div>`;
  }
}

function offerCardTemplate(o) {
  const img = o.image || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1000&q=80';
  const safe = (s) => String(s || '').replace(/[<>]/g, '');
  return `
    <a class="offer-card" href="${o.ctaLink || '/booking.html'}" aria-label="${safe(o.title)}">
      <img src="${img}" alt="${safe(o.title)}" loading="lazy" />
      <div class="offer-content">
        ${o.discountText ? `<span class="offer-badge">${safe(o.discountText)}</span>` : ''}
        <h3>${safe(o.title)}</h3>
        <p>${safe(o.subtitle || o.description)}</p>
        <span class="link">
          ${safe(o.ctaText || 'Discover Offer')}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </span>
      </div>
    </a>`;
}

/* ---------------- Availability form ---------------- */
function initAvailabilityForm() {
  const form = document.getElementById('availabilityForm');
  const checkIn = document.getElementById('checkIn');
  const checkOut = document.getElementById('checkOut');
  const result = document.getElementById('availabilityResult');
  if (!form || !checkIn || !checkOut || !result) return;

  const today = new Date().toISOString().split('T')[0];
  checkIn.min = today;
  checkOut.min = today;

  checkIn.addEventListener('change', () => {
    checkOut.min = checkIn.value;
    if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    result.className = 'booking-availability';

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    if (!data.checkIn || !data.checkOut) {
      result.classList.add('show', 'error');
      result.textContent = 'Please select both check-in and check-out dates.';
      return;
    }
    if (data.checkIn >= data.checkOut) {
      result.classList.add('show', 'error');
      result.textContent = 'Check-out date must be after check-in date.';
      return;
    }

    result.classList.add('show', 'success');
    result.textContent = 'Checking availability…';

    try {
      const params = new URLSearchParams({
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        adults: data.adults,
        children: data.children,
        rooms: data.rooms,
      });
      const resp = await apiRequest(`/rooms?${params.toString()}`);
      const available = resp.rooms || [];
      if (!available.length) {
        result.classList.add('show', 'error');
        result.textContent = 'No rooms available for the selected dates. Please adjust your search.';
        return;
      }
      result.classList.add('show', 'success');
      result.innerHTML = `✓ <strong>${available.length}</strong> room${available.length > 1 ? 's' : ''} available for your dates. <a href="/rooms.html">View options →</a>`;
    } catch (err) {
      // Graceful fallback: forward to full rooms page
      result.classList.add('show', 'success');
      result.innerHTML = `Continue to our <a href="/rooms.html">rooms page</a> to see live availability and complete your reservation.`;
    }
  });
}

/* ---------------- Newsletter ---------------- */
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  const status = document.getElementById('newsletterStatus');
  if (!form || !status) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'newsletter-status';
    status.textContent = '';

    const email = document.getElementById('newsletterEmail').value.trim();
    const consent = document.getElementById('newsletterConsent').checked;

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      status.classList.add('error');
      status.textContent = 'Please enter a valid email address.';
      return;
    }
    if (!consent) {
      status.classList.add('error');
      status.textContent = 'Please accept the consent notice to subscribe.';
      return;
    }

    try {
      const resp = await apiRequest('/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email, consent: true, source: 'homepage' }),
      });
      status.classList.add('success');
      status.textContent = resp.message || 'Thank you for subscribing!';
      form.reset();
    } catch (err) {
      status.classList.add('error');
      status.textContent = err.message || 'Unable to subscribe right now. Please try again later.';
    }
  });
}

/* ---------------- Testimonials carousel ---------------- */
function initTestimonials() {
  const track = document.getElementById('testimonialTrack');
  const nav = document.getElementById('testimonialNav');
  if (!track || !nav) return;

  const slides = track.querySelectorAll('.testimonial');
  const dots = nav.querySelectorAll('.testimonial-dot');
  if (slides.length < 2) return;

  let i = 0;
  let timer;

  const go = (k) => {
    i = (k + slides.length) % slides.length;
    slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
    dots.forEach((d, idx) => {
      d.classList.toggle('active', idx === i);
      d.setAttribute('aria-selected', String(idx === i));
    });
  };

  const start = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stop();
    timer = setInterval(() => go(i + 1), 7000);
  };
  const stop = () => clearInterval(timer);

  dots.forEach((d, k) => d.addEventListener('click', () => { go(k); start(); }));
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  go(0);
  start();
}