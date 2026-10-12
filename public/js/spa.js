/* =============================================================
   Spa page — appointment form handling
   ============================================================= */

(function () {
  'use strict';

  function initSpaForm() {
    const form = document.getElementById('spaForm');
    if (!form) return;

    const alertBox = document.getElementById('spaAlert');
    const dateInput = document.getElementById('sDate');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    // Min date = today
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.min = today;
    }

    // Sync treatment duration
    const treatmentSelect = document.getElementById('sTreatment');
    let currentDuration = '';
    if (treatmentSelect) {
      treatmentSelect.addEventListener('change', () => {
        const opt = treatmentSelect.options[treatmentSelect.selectedIndex];
        currentDuration = opt.getAttribute('data-duration') || '';
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.innerHTML = '';

      const fd = Object.fromEntries(new FormData(form).entries());
      const errors = [];

      if (!fd.guestName || fd.guestName.trim().length < 2) errors.push('Please enter your full name.');
      if (!/^\S+@\S+\.\S+$/.test(fd.email || '')) errors.push('Please enter a valid email address.');
      if (!fd.phone || fd.phone.replace(/\D/g, '').length < 7) errors.push('Please enter a valid phone number.');
      if (!fd.treatment) errors.push('Please select a treatment.');
      if (!fd.preferredDate) errors.push('Please choose a preferred date.');
      if (!fd.preferredTime) errors.push('Please choose a preferred time.');

      if (errors.length) {
        return showAlert(errors.map((e) => `• ${e}`).join('<br/>'), 'error');
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      try {
        const resp = await apiRequest('/spa', {
          method: 'POST',
          body: JSON.stringify({
            guestName: fd.guestName.trim(),
            email: fd.email.trim(),
            phone: fd.phone.trim(),
            treatment: fd.treatment,
            treatmentDuration: currentDuration,
            therapist: fd.therapist,
            preferredDate: fd.preferredDate,
            preferredTime: fd.preferredTime,
            guests: Number(fd.guests) || 1,
            specialRequests: (fd.specialRequests || '').trim(),
          }),
        });

        showAlert(
          `<strong>Appointment Requested</strong><br/>Reference: <strong style="color:var(--gold-500)">${resp.appointment.appointmentId}</strong><br/>Our spa team will contact you shortly to confirm.`,
          'success'
        );
        form.reset();
        if (dateInput) {
          const today = new Date().toISOString().split('T')[0];
          dateInput.min = today;
        }
      } catch (err) {
        showAlert(err.message || 'We could not process your request. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  function showAlert(msg, type) {
    const box = document.getElementById('spaAlert');
    if (!box) return;
    box.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  document.addEventListener('DOMContentLoaded', initSpaForm);
})();