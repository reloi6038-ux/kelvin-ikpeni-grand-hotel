/* =============================================================
   ADMIN DASHBOARD — full-featured control panel
   ============================================================= */

(function () {
  'use strict';

  const state = {
    tab: 'overview',
    admin: null,
    bookings: [],
    rooms: [],
    offers: [],
    messages: [],
    reviews: [],
    spaAppointments: [],
    subscribers: [],
    siteInfo: null,
  };

  /* ---------------- API wrapper with auth ---------------- */
  async function api(endpoint, options = {}) {
    const token = localStorage.getItem('kigh_token');
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
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

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('kigh_token');
    if (token) {
      // Validate token
      api('/auth/me')
        .then((res) => {
          state.admin = res.admin;
          enterDashboard();
        })
        .catch(() => {
          localStorage.removeItem('kigh_token');
          showLogin();
        });
    } else {
      showLogin();
    }

    wireLoginForm();
    wireLogout();
    wireNav();
    wireMenuToggle();
    wirePasswordToggle();
  });

  /* ---------------- Login ---------------- */
  function wireLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('loginAlert');
      alertBox.innerHTML = '';
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Signing in…';

      const fd = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify(fd),
        });
        localStorage.setItem('kigh_token', res.token);
        state.admin = res.admin;
        enterDashboard();
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  function wirePasswordToggle() {
    const toggle = document.querySelector('.password-toggle');
    const input = document.getElementById('aPassword');
    if (!toggle || !input) return;
    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      toggle.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  }

  function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').classList.add('hidden');
  }

  function enterDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').classList.remove('hidden');
    const name = state.admin?.name || 'Admin';
    document.getElementById('adminName').textContent = name;
    document.getElementById('adminRole').textContent = state.admin?.role || 'Administrator';
    document.getElementById('adminAvatar').textContent = name.charAt(0).toUpperCase();
    loadTab('overview');
  }

  function wireLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      localStorage.removeItem('kigh_token');
      state.admin = null;
      showLogin();
    });
  }

  function wireMenuToggle() {
    document.getElementById('adminMenuToggle')?.addEventListener('click', () => {
      document.getElementById('adminSidebar').classList.toggle('open');
    });
  }

  /* ---------------- Navigation ---------------- */
  function wireNav() {
    document.querySelectorAll('.admin-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        loadTab(tab);
        document.getElementById('adminSidebar').classList.remove('open');
      });
    });
  }

  function setActiveTab(tab) {
    document.querySelectorAll('.admin-nav-item').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    const titles = {
      overview: 'Overview',
      bookings: 'Bookings',
      rooms: 'Rooms',
      offers: 'Special Offers',
      messages: 'Guest Messages',
      reviews: 'Guest Reviews',
      spa: 'Spa Appointments',
      subscribers: 'Newsletter Subscribers',
      settings: 'Site Settings',
    };
    document.getElementById('pageTitle').textContent = titles[tab] || 'Dashboard';
  }

  async function loadTab(tab) {
    state.tab = tab;
    setActiveTab(tab);
    const content = document.getElementById('adminContent');
    content.innerHTML = '<div class="spinner"></div>';

    try {
      if (tab === 'overview') await renderOverview();
      else if (tab === 'bookings') await renderBookings();
      else if (tab === 'rooms') await renderRooms();
      else if (tab === 'offers') await renderOffers();
      else if (tab === 'messages') await renderMessages();
      else if (tab === 'reviews') await renderReviews();
      else if (tab === 'spa') await renderSpa();
      else if (tab === 'subscribers') await renderSubscribers();
      else if (tab === 'settings') await renderSettings();
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem('kigh_token');
        showLogin();
        return;
      }
      content.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  async function renderOverview() {
    const content = document.getElementById('adminContent');

    const [dash, bookings, messages, reviews] = await Promise.all([
      api('/admin/dashboard').catch(() => ({ dashboard: {} })),
      api('/bookings').catch(() => ({ bookings: [] })),
      api('/contact').catch(() => ({ contacts: [] })),
      api('/reviews/all').catch(() => ({ reviews: [] })),
    ]);

    const d = dash.dashboard || {};
    const pendingMessages = messages.contacts?.filter((c) => c.status === 'new').length || 0;
    const pendingReviews = reviews.reviews?.filter((r) => !r.isApproved).length || 0;

    // Update sidebar badges
    updateBadge('badge-bookings', d.pendingBookings || 0);
    updateBadge('badge-messages', pendingMessages);
    updateBadge('badge-reviews', pendingReviews);

    state.bookings = bookings.bookings || [];

    content.innerHTML = `
      <div class="admin-stats">
        <div class="admin-stat">
          <span class="admin-stat-label">Total Bookings</span>
          <div class="admin-stat-value">${d.totalBookings || 0}</div>
          <span class="admin-stat-sub">${d.pendingBookings || 0} pending</span>
          <div class="admin-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>
        </div>
        <div class="admin-stat">
          <span class="admin-stat-label">Revenue</span>
          <div class="admin-stat-value" style="font-size:1.5rem">${formatCurrency(d.totalRevenue || 0)}</div>
          <span class="admin-stat-sub">Confirmed &amp; completed</span>
          <div class="admin-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        </div>
        <div class="admin-stat">
          <span class="admin-stat-label">Active Rooms</span>
          <div class="admin-stat-value">${d.totalRooms || 0}</div>
          <span class="admin-stat-sub">Available for booking</span>
          <div class="admin-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M6 10V6h12v4"/></svg></div>
        </div>
        <div class="admin-stat">
          <span class="admin-stat-label">Messages</span>
          <div class="admin-stat-value">${d.totalContacts || 0}</div>
          <span class="admin-stat-sub">${pendingMessages} unread</span>
          <div class="admin-stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        </div>
      </div>

      <div class="admin-overview-grid">
        <div class="admin-panel">
          <div class="admin-panel-header">
            <div class="admin-panel-title">Recent Bookings<small>Latest guest reservations</small></div>
          </div>
          ${
            state.bookings.length
              ? `<div class="admin-recent-list">
                  ${state.bookings
                    .slice(0, 6)
                    .map(
                      (b) => `
                    <div class="admin-recent-item">
                      <div class="admin-recent-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </div>
                      <div class="admin-recent-body">
                        <strong>${esc(b.guestName)}</strong>
                        <span>${esc(b.roomName || 'Room')} · ${formatDate(b.checkIn)} – ${formatDate(b.checkOut)}</span>
                      </div>
                      <div class="admin-recent-amount">${formatCurrency(b.totalPrice)}</div>
                    </div>`
                    )
                    .join('')}
                </div>`
              : adminEmpty('No bookings yet', 'Bookings will appear here as guests reserve.')
          }
        </div>

        <div class="admin-panel">
          <div class="admin-panel-header">
            <div class="admin-panel-title">Quick Actions<small>Common tasks</small></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-gold-outline" onclick="document.querySelector('[data-tab=bookings]').click()">Manage Bookings</button>
            <button class="btn btn-gold-outline" onclick="document.querySelector('[data-tab=rooms]').click()">Manage Rooms</button>
            <button class="btn btn-gold-outline" onclick="document.querySelector('[data-tab=offers]').click()">Manage Offers</button>
            <button class="btn btn-gold-outline" onclick="document.querySelector('[data-tab=messages]').click()">View Messages</button>
          </div>
        </div>
      </div>
    `;
  }

  function updateBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
      el.textContent = count;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  /* ============================================================
     BOOKINGS
     ============================================================ */
  async function renderBookings() {
    const content = document.getElementById('adminContent');
    const { bookings } = await api('/bookings');
    state.bookings = bookings;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">All Bookings<small>${bookings.length} total reservation${bookings.length === 1 ? '' : 's'}</small></div>
        </div>

        <div class="admin-filters">
          <input type="search" id="bookingSearch" placeholder="Search guest or booking ID…" />
          <select id="bookingStatusFilter">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked-In</option>
            <option value="checked-out">Checked-Out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        ${
          bookings.length
            ? `<div class="admin-table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Guest</th>
                      <th>Room</th>
                      <th>Dates</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="bookingsBody">
                    ${bookings.map(bookingRow).join('')}
                  </tbody>
                </table>
              </div>`
            : adminEmpty('No Bookings Yet', 'Guest reservations will appear here.')
        }
      </div>
    `;

    document.getElementById('bookingSearch')?.addEventListener('input', filterBookings);
    document.getElementById('bookingStatusFilter')?.addEventListener('change', filterBookings);
  }

  function bookingRow(b) {
    return `
      <tr data-id="${b._id}" data-status="${b.status}" data-search="${esc((b.guestName + ' ' + (b.bookingId || '')).toLowerCase())}">
        <td><strong style="color:var(--gold-500)">${esc(b.bookingId || '—')}</strong></td>
        <td>
          <strong>${esc(b.guestName)}</strong><br/>
          <small>${esc(b.email)}</small><br/>
          <small>${esc(b.phone || '')}</small>
        </td>
        <td>${esc(b.roomName || b.room?.name || '—')}</td>
        <td>
          <strong>${formatDate(b.checkIn)}</strong><br/>
          <small>to ${formatDate(b.checkOut)}</small><br/>
          <small>${b.nights} night${b.nights === 1 ? '' : 's'} · ${b.guests} guest${b.guests === 1 ? '' : 's'}</small>
        </td>
        <td><strong style="color:var(--gold-500)">${formatCurrency(b.totalPrice)}</strong></td>
        <td><span class="status-badge status-${b.status}">${esc(b.status)}</span></td>
        <td>
          <select class="admin-select" onchange="window.__adminUpdateBooking('${b._id}', this.value)">
            ${['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled']
              .map((s) => `<option value="${s}" ${s === b.status ? 'selected' : ''}>${s}</option>`)
              .join('')}
          </select>
        </td>
      </tr>
    `;
  }

  function filterBookings() {
    const q = (document.getElementById('bookingSearch')?.value || '').toLowerCase();
    const status = document.getElementById('bookingStatusFilter')?.value || '';
    document.querySelectorAll('#bookingsBody tr').forEach((row) => {
      const match = (!q || row.dataset.search.includes(q)) && (!status || row.dataset.status === status);
      row.style.display = match ? '' : 'none';
    });
  }

  window.__adminUpdateBooking = async (id, status) => {
    try {
      await api(`/bookings/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast(`Booking updated to "${status}"`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  /* ============================================================
     ROOMS
     ============================================================ */
  async function renderRooms() {
    const content = document.getElementById('adminContent');
    const { rooms } = await api('/rooms');
    state.rooms = rooms;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">Rooms &amp; Suites<small>${rooms.length} room${rooms.length === 1 ? '' : 's'} configured</small></div>
          <button class="btn btn-primary btn-sm" id="addRoomBtn">+ Add Room</button>
        </div>

        ${
          rooms.length
            ? `<div class="admin-table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Type</th>
                      <th>Price</th>
                      <th>Capacity</th>
                      <th>Featured</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rooms.map(roomRow).join('')}
                  </tbody>
                </table>
              </div>`
            : adminEmpty('No Rooms Yet', 'Add your first room to begin accepting bookings.')
        }
      </div>

      <div class="admin-panel hidden" id="roomFormPanel">
        <div class="admin-panel-header">
          <div class="admin-panel-title" id="roomFormTitle">Add New Room</div>
          <button class="btn-icon" id="closeRoomForm" aria-label="Close">✕</button>
        </div>
        <form class="admin-form" id="roomForm">
          <input type="hidden" name="_id" />
          <div class="admin-form-grid">
            <div class="form-group admin-form-full">
              <label>Room Name *</label>
              <input name="name" class="form-control" required />
            </div>
            <div class="form-group">
              <label>Type *</label>
              <select name="type" class="form-control" required>
                <option>Standard</option><option>Deluxe</option><option>Executive</option>
                <option>Suite</option><option>Presidential</option>
              </select>
            </div>
            <div class="form-group">
              <label>Price (₦) *</label>
              <input type="number" name="price" class="form-control" required min="0" />
            </div>
            <div class="form-group">
              <label>Capacity *</label>
              <input type="number" name="capacity" class="form-control" value="2" min="1" max="8" required />
            </div>
            <div class="form-group">
              <label>Bed Type</label>
              <input name="beds" class="form-control" value="1 King Bed" />
            </div>
            <div class="form-group">
              <label>Size</label>
              <input name="size" class="form-control" value="45 sqm" />
            </div>
            <div class="form-group admin-form-full">
              <label>Short Description</label>
              <input name="shortDescription" class="form-control" maxlength="200" />
            </div>
            <div class="form-group admin-form-full">
              <label>Full Description *</label>
              <textarea name="description" class="form-control" rows="4" required></textarea>
            </div>
            <div class="form-group admin-form-full">
              <label>Image URL</label>
              <input name="image" class="form-control" placeholder="https://…" />
            </div>
            <div class="form-group admin-form-full">
              <label>Amenities (comma separated)</label>
              <input name="amenities" class="form-control" placeholder="WiFi, AC, Mini Bar, Balcony" />
            </div>
            <div class="form-group">
              <label><input type="checkbox" name="featured" /> Featured on homepage</label>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:20px">
            <button type="submit" class="btn btn-primary">Save Room</button>
            <button type="button" class="btn btn-outline" id="cancelRoomForm">Cancel</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('addRoomBtn')?.addEventListener('click', () => openRoomForm());
    document.getElementById('closeRoomForm')?.addEventListener('click', closeRoomForm);
    document.getElementById('cancelRoomForm')?.addEventListener('click', closeRoomForm);
    document.getElementById('roomForm')?.addEventListener('submit', submitRoomForm);

    document.querySelectorAll('[data-edit-room]').forEach((btn) =>
      btn.addEventListener('click', () => openRoomForm(btn.getAttribute('data-edit-room')))
    );
    document.querySelectorAll('[data-delete-room]').forEach((btn) =>
      btn.addEventListener('click', () => deleteRoom(btn.getAttribute('data-delete-room')))
    );
  }

  function roomRow(r) {
    return `
      <tr>
        <td><strong>${esc(r.name)}</strong><br/><small>${esc(r.beds || '')} · ${esc(r.size || '')}</small></td>
        <td>${esc(r.type)}</td>
        <td><strong style="color:var(--gold-500)">${formatCurrency(r.price)}</strong></td>
        <td>${r.capacity} guests</td>
        <td>${r.featured ? '✓' : '—'}</td>
        <td>
          <div class="admin-actions">
            <button class="btn-icon" data-edit-room="${r._id}" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
            <button class="btn-icon danger" data-delete-room="${r._id}" aria-label="Archive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
          </div>
        </td>
      </tr>
    `;
  }

  function openRoomForm(id) {
    const panel = document.getElementById('roomFormPanel');
    const form = document.getElementById('roomForm');
    const title = document.getElementById('roomFormTitle');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (id) {
      const room = state.rooms.find((r) => r._id === id);
      if (!room) return;
      title.textContent = 'Edit Room';
      form._id.value = room._id;
      form.name.value = room.name || '';
      form.type.value = room.type || 'Standard';
      form.price.value = room.price || '';
      form.capacity.value = room.capacity || 2;
      form.beds.value = room.beds || '';
      form.size.value = room.size || '';
      form.shortDescription.value = room.shortDescription || '';
      form.description.value = room.description || '';
      form.image.value = (room.images && room.images[0]) || '';
      form.amenities.value = (room.amenities || []).join(', ');
      form.featured.checked = !!room.featured;
    } else {
      title.textContent = 'Add New Room';
      form.reset();
      form._id.value = '';
    }
  }

  function closeRoomForm() {
    document.getElementById('roomFormPanel').classList.add('hidden');
  }

  async function submitRoomForm(e) {
    e.preventDefault();
    const form = e.target;
    const fd = Object.fromEntries(new FormData(form).entries());
    const id = fd._id;
    delete fd._id;

    const payload = {
      name: fd.name.trim(),
      type: fd.type,
      price: Number(fd.price),
      capacity: Number(fd.capacity),
      beds: fd.beds || '1 King Bed',
      size: fd.size || '45 sqm',
      shortDescription: fd.shortDescription || '',
      description: fd.description.trim(),
      images: fd.image ? [fd.image.trim()] : [],
      amenities: fd.amenities
        ? fd.amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : [],
      featured: !!fd.featured,
    };

    try {
      if (id) {
        await api(`/rooms/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Room updated');
      } else {
        await api('/rooms', { method: 'POST', body: JSON.stringify(payload) });
        toast('Room created');
      }
      closeRoomForm();
      loadTab('rooms');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function deleteRoom(id) {
    if (!confirm('Archive this room? It will no longer be shown to guests.')) return;
    try {
      await api(`/rooms/${id}`, { method: 'DELETE' });
      toast('Room archived');
      loadTab('rooms');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ============================================================
     OFFERS
     ============================================================ */
  async function renderOffers() {
    const content = document.getElementById('adminContent');
    const { offers } = await api('/offers');
    state.offers = offers;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">Special Offers<small>${offers.length} offer${offers.length === 1 ? '' : 's'}</small></div>
          <button class="btn btn-primary btn-sm" id="addOfferBtn">+ Add Offer</button>
        </div>
        ${
          offers.length
            ? `<div class="admin-table-wrap">
                <table class="admin-table">
                  <thead><tr><th>Title</th><th>Badge</th><th>Valid Until</th><th>Featured</th><th>Actions</th></tr></thead>
                  <tbody>
                    ${offers
                      .map(
                        (o) => `
                      <tr>
                        <td><strong>${esc(o.title)}</strong><br/><small>${esc(o.subtitle || '')}</small></td>
                        <td>${esc(o.discountText || '—')}</td>
                        <td>${o.validUntil ? formatDate(o.validUntil) : '—'}</td>
                        <td>${o.isFeatured ? '✓' : '—'}</td>
                        <td>
                          <div class="admin-actions">
                            <button class="btn-icon" data-edit-offer="${o._id}" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
                            <button class="btn-icon danger" data-delete-offer="${o._id}" aria-label="Archive"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
                          </div>
                        </td>
                      </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
            : adminEmpty('No Offers Yet', 'Create promotional offers to display on the homepage.')
        }
      </div>

      <div class="admin-panel hidden" id="offerFormPanel">
        <div class="admin-panel-header">
          <div class="admin-panel-title" id="offerFormTitle">Add Offer</div>
          <button class="btn-icon" id="closeOfferForm" aria-label="Close">✕</button>
        </div>
        <form class="admin-form" id="offerForm">
          <input type="hidden" name="_id" />
          <div class="admin-form-grid">
            <div class="form-group admin-form-full"><label>Title *</label><input name="title" class="form-control" required /></div>
            <div class="form-group admin-form-full"><label>Subtitle</label><input name="subtitle" class="form-control" /></div>
            <div class="form-group admin-form-full"><label>Description *</label><textarea name="description" class="form-control" rows="3" required></textarea></div>
            <div class="form-group"><label>Badge Text</label><input name="discountText" class="form-control" placeholder="e.g. Save 20%" /></div>
            <div class="form-group"><label>Valid Until</label><input name="validUntil" type="date" class="form-control" /></div>
            <div class="form-group admin-form-full"><label>Image URL</label><input name="image" class="form-control" /></div>
            <div class="form-group admin-form-full"><label>CTA Link</label><input name="ctaLink" class="form-control" value="/booking.html" /></div>
            <div class="form-group"><label><input type="checkbox" name="isFeatured" /> Featured</label></div>
          </div>
          <div style="display:flex;gap:12px;margin-top:20px">
            <button type="submit" class="btn btn-primary">Save Offer</button>
            <button type="button" class="btn btn-outline" id="cancelOfferForm">Cancel</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('addOfferBtn')?.addEventListener('click', () => openOfferForm());
    document.getElementById('closeOfferForm')?.addEventListener('click', closeOfferForm);
    document.getElementById('cancelOfferForm')?.addEventListener('click', closeOfferForm);
    document.getElementById('offerForm')?.addEventListener('submit', submitOfferForm);
    document.querySelectorAll('[data-edit-offer]').forEach((b) => b.addEventListener('click', () => openOfferForm(b.dataset.editOffer)));
    document.querySelectorAll('[data-delete-offer]').forEach((b) => b.addEventListener('click', () => deleteOffer(b.dataset.deleteOffer)));
  }

  function openOfferForm(id) {
    const panel = document.getElementById('offerFormPanel');
    const form = document.getElementById('offerForm');
    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (id) {
      const offer = state.offers.find((o) => o._id === id);
      if (!offer) return;
      document.getElementById('offerFormTitle').textContent = 'Edit Offer';
      form._id.value = offer._id;
      form.title.value = offer.title || '';
      form.subtitle.value = offer.subtitle || '';
      form.description.value = offer.description || '';
      form.discountText.value = offer.discountText || '';
      form.validUntil.value = offer.validUntil ? offer.validUntil.split('T')[0] : '';
      form.image.value = offer.image || '';
      form.ctaLink.value = offer.ctaLink || '/booking.html';
      form.isFeatured.checked = !!offer.isFeatured;
    } else {
      document.getElementById('offerFormTitle').textContent = 'Add Offer';
      form.reset();
      form._id.value = '';
      form.ctaLink.value = '/booking.html';
    }
  }

  function closeOfferForm() {
    document.getElementById('offerFormPanel').classList.add('hidden');
  }

  async function submitOfferForm(e) {
    e.preventDefault();
    const form = e.target;
    const fd = Object.fromEntries(new FormData(form).entries());
    const id = fd._id;
    delete fd._id;

    const payload = {
      title: fd.title.trim(),
      subtitle: fd.subtitle || '',
      description: fd.description.trim(),
      discountText: fd.discountText || '',
      validUntil: fd.validUntil || null,
      image: fd.image || '',
      ctaLink: fd.ctaLink || '/booking.html',
      isFeatured: !!fd.isFeatured,
    };

    try {
      if (id) {
        await api(`/offers/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('Offer updated');
      } else {
        await api('/offers', { method: 'POST', body: JSON.stringify(payload) });
        toast('Offer created');
      }
      closeOfferForm();
      loadTab('offers');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function deleteOffer(id) {
    if (!confirm('Archive this offer?')) return;
    try {
      await api(`/offers/${id}`, { method: 'DELETE' });
      toast('Offer archived');
      loadTab('offers');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  /* ============================================================
     MESSAGES
     ============================================================ */
  async function renderMessages() {
    const content = document.getElementById('adminContent');
    const { contacts } = await api('/contact');
    state.messages = contacts;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">Guest Messages<small>${contacts.length} message${contacts.length === 1 ? '' : 's'}</small></div>
        </div>
        ${
          contacts.length
            ? `<div style="display:flex;flex-direction:column;gap:14px">
                ${contacts
                  .map(
                    (c) => `
                  <div class="admin-recent-item" style="flex-direction:column;align-items:stretch;gap:12px;padding:20px">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
                      <div>
                        <strong style="color:var(--white);font-family:var(--font-sans)">${esc(c.name)}</strong>
                        <span style="color:var(--text-muted);font-size:0.82rem;margin-left:10px">${esc(c.email)}</span>
                      </div>
                      <div style="display:flex;gap:10px;align-items:center">
                        <span class="status-badge status-${c.status}">${esc(c.status)}</span>
                        <small style="color:var(--text-muted);font-size:0.75rem">${formatDate(c.createdAt)}</small>
                      </div>
                    </div>
                    <div style="padding:14px;background:rgba(10,21,36,0.6);border-radius:6px">
                      <strong style="color:var(--gold-500);font-family:var(--font-display);display:block;margin-bottom:8px">${esc(c.subject)}</strong>
                      <p style="color:var(--text-secondary);font-family:var(--font-sans);font-size:0.9rem;line-height:1.6;white-space:pre-wrap">${esc(c.message)}</p>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <select class="admin-select" onchange="window.__adminUpdateMessage('${c._id}', this.value)">
                        ${['new', 'read', 'responded', 'archived'].map((s) => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}
                      </select>
                      <a href="mailto:${esc(c.email)}?subject=Re: ${encodeURIComponent(c.subject)}" class="btn btn-gold-outline btn-sm" style="padding:8px 16px;font-size:0.7rem">Reply by Email</a>
                    </div>
                  </div>`
                  )
                  .join('')}
              </div>`
            : adminEmpty('No Messages Yet', 'Enquiries submitted via the contact form will appear here.')
        }
      </div>
    `;
  }

  window.__adminUpdateMessage = async (id, status) => {
    try {
      await api(`/contact/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      toast('Message updated');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  /* ============================================================
     REVIEWS
     ============================================================ */
  async function renderReviews() {
    const content = document.getElementById('adminContent');
    const { reviews } = await api('/reviews/all');
    state.reviews = reviews;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">Guest Reviews<small>${reviews.length} review${reviews.length === 1 ? '' : 's'}</small></div>
        </div>
        ${
          reviews.length
            ? `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">
                ${reviews
                  .map(
                    (r) => `
                  <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);border-radius:10px;padding:20px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:12px">
                      <div style="color:var(--gold-500);letter-spacing:2px">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                      <span class="status-badge ${r.isApproved ? 'status-confirmed' : 'status-pending'}">${r.isApproved ? 'Approved' : 'Pending'}</span>
                    </div>
                    <strong style="color:var(--white);font-family:var(--font-display);display:block;margin-bottom:8px">${esc(r.title)}</strong>
                    <p style="color:var(--text-secondary);font-family:var(--font-sans);font-size:0.88rem;line-height:1.6;margin-bottom:12px">${esc(r.comment)}</p>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                      <small style="color:var(--gold-500);font-style:italic">— ${esc(r.guestName)}</small>
                      <small style="color:var(--text-muted);font-size:0.72rem">${formatDate(r.createdAt)}</small>
                    </div>
                    <div style="display:flex;gap:8px">
                      ${!r.isApproved ? `<button class="btn-icon" data-approve-review="${r._id}" aria-label="Approve"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></button>` : ''}
                      <button class="btn-icon danger" data-delete-review="${r._id}" aria-label="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
                    </div>
                  </div>`
                  )
                  .join('')}
              </div>`
            : adminEmpty('No Reviews Yet', 'Guest reviews will appear here once submitted.')
        }
      </div>
    `;

    document.querySelectorAll('[data-approve-review]').forEach((b) =>
      b.addEventListener('click', async () => {
        try {
          await api(`/reviews/${b.dataset.approveReview}/approve`, { method: 'PUT' });
          toast('Review approved');
          loadTab('reviews');
        } catch (err) {
          toast(err.message, 'error');
        }
      })
    );
    document.querySelectorAll('[data-delete-review]').forEach((b) =>
      b.addEventListener('click', async () => {
        if (!confirm('Delete this review?')) return;
        try {
          await api(`/reviews/${b.dataset.deleteReview}`, { method: 'DELETE' });
          toast('Review deleted');
          loadTab('reviews');
        } catch (err) {
          toast(err.message, 'error');
        }
      })
    );
  }

  /* ============================================================
     SPA APPOINTMENTS
     ============================================================ */
  async function renderSpa() {
    const content = document.getElementById('adminContent');
    let appointments = [];
    try {
      const res = await api('/spa');
      appointments = res.appointments || [];
    } catch (_) {
      appointments = [];
    }
    state.spaAppointments = appointments;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">Spa Appointments<small>${appointments.length} request${appointments.length === 1 ? '' : 's'}</small></div>
        </div>
        ${
          appointments.length
            ? `<div class="admin-table-wrap">
                <table class="admin-table">
                  <thead><tr><th>Reference</th><th>Guest</th><th>Treatment</th><th>Preferred</th><th>Guests</th><th>Status</th></tr></thead>
                  <tbody>
                    ${appointments
                      .map(
                        (a) => `
                      <tr>
                        <td><strong style="color:var(--gold-500)">${esc(a.appointmentId)}</strong></td>
                        <td><strong>${esc(a.guestName)}</strong><br/><small>${esc(a.email)}</small><br/><small>${esc(a.phone)}</small></td>
                        <td>${esc(a.treatment)}<br/><small>${esc(a.treatmentDuration || '')}</small></td>
                        <td>${formatDate(a.preferredDate)}<br/><small>${esc(a.preferredTime)}</small></td>
                        <td>${a.guests}</td>
                        <td>
                          <select class="admin-select" onchange="window.__adminUpdateSpa('${a._id}', this.value)">
                            ${['pending', 'confirmed', 'completed', 'cancelled'].map((s) => `<option value="${s}" ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}
                          </select>
                        </td>
                      </tr>`
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>`
            : adminEmpty('No Spa Appointments', 'Spa booking requests will appear here.')
        }
      </div>
    `;
  }

  window.__adminUpdateSpa = async (id, status) => {
    try {
      await api(`/spa/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast('Appointment updated');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  /* ============================================================
     SUBSCRIBERS
     ============================================================ */
  async function renderSubscribers() {
    const content = document.getElementById('adminContent');
    let subscribers = [];
    try {
      const res = await api('/newsletter');
      subscribers = res.subscribers || [];
    } catch (_) {
      subscribers = [];
    }
    state.subscribers = subscribers;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">Newsletter Subscribers<small>${subscribers.length} active subscriber${subscribers.length === 1 ? '' : 's'}</small></div>
        </div>
        ${
          subscribers.length
            ? `<div class="admin-table-wrap">
                <table class="admin-table">
                  <thead><tr><th>Email</th><th>Source</th><th>Subscribed</th></tr></thead>
                  <tbody>
                    ${subscribers.map((s) => `<tr><td>${esc(s.email)}</td><td>${esc(s.source || '—')}</td><td>${formatDate(s.createdAt)}</td></tr>`).join('')}
                  </tbody>
                </table>
              </div>`
            : adminEmpty('No Subscribers Yet', 'Newsletter subscribers will appear here.')
        }
      </div>
    `;
  }

  /* ============================================================
     SITE SETTINGS
     ============================================================ */
  async function renderSettings() {
    const content = document.getElementById('adminContent');
    let info = {};
    try {
      const res = await api('/site-info');
      info = res.siteInfo || {};
    } catch (_) {
      info = {};
    }
    state.siteInfo = info;

    content.innerHTML = `
      <div class="admin-panel">
        <div class="admin-panel-header">
          <div class="admin-panel-title">Site &amp; Contact Settings<small>These values appear across the public site</small></div>
        </div>
        <form class="admin-form" id="settingsForm">
          <div class="admin-form-grid">
            <div class="form-group admin-form-full"><label>Hotel Name</label><input name="hotelName" class="form-control" value="${esc(info.hotelName || 'The Kelvin Ikpeni Grand Hotel')}" /></div>
            <div class="form-group admin-form-full"><label>Tagline</label><input name="tagline" class="form-control" value="${esc(info.tagline || '')}" /></div>
            <div class="form-group"><label>Phone</label><input name="phone" class="form-control" value="${esc(info.phone || '')}" /></div>
            <div class="form-group"><label>Email</label><input name="email" class="form-control" value="${esc(info.email || '')}" /></div>
            <div class="form-group admin-form-full"><label>Street</label><input name="street" class="form-control" value="${esc(info.address?.street || '')}" /></div>
            <div class="form-group"><label>City</label><input name="city" class="form-control" value="${esc(info.address?.city || '')}" /></div>
            <div class="form-group"><label>Country</label><input name="country" class="form-control" value="${esc(info.address?.country || '')}" /></div>
            <div class="form-group"><label>Facebook URL</label><input name="facebook" class="form-control" value="${esc(info.social?.facebook || '')}" /></div>
            <div class="form-group"><label>Instagram URL</label><input name="instagram" class="form-control" value="${esc(info.social?.instagram || '')}" /></div>
            <div class="form-group admin-form-full"><label>Map Embed URL</label><input name="mapEmbedUrl" class="form-control" value="${esc(info.mapEmbedUrl || '')}" /></div>
          </div>
          <div style="margin-top:20px"><button type="submit" class="btn btn-primary">Save Settings</button></div>
        </form>
      </div>
    `;

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      const payload = {
        hotelName: fd.hotelName,
        tagline: fd.tagline,
        phone: fd.phone,
        email: fd.email,
        address: {
          street: fd.street,
          city: fd.city,
          country: fd.country,
        },
        social: {
          facebook: fd.facebook,
          instagram: fd.instagram,
        },
        mapEmbedUrl: fd.mapEmbedUrl,
      };
      try {
        await api('/site-info', { method: 'PUT', body: JSON.stringify(payload) });
        toast('Settings saved');
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  /* ---------------- Helpers ---------------- */
  function adminEmpty(title, message) {
    return `
      <div class="admin-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <h4>${esc(title)}</h4>
        <p>${esc(message)}</p>
      </div>`;
  }

  function toast(msg, type = 'success') {
    if (typeof showToast === 'function') return showToast(msg, type);
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText =
      'position:fixed;top:90px;right:24px;padding:14px 22px;background:#1a3a5c;color:#fff;border-radius:6px;border-left:4px solid ' +
      (type === 'error' ? '#e74c3c' : '#c9a961') +
      ';font-family:Inter,sans-serif;font-size:0.88rem;z-index:9999;box-shadow:0 10px 40px rgba(0,0,0,0.4)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function formatCurrency(n) {
    return `₦${Number(n || 0).toLocaleString('en-NG')}`;
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
})();