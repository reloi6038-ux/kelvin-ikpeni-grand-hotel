/* =============================================================
   Contact page — enhanced form, department routing, priority,
   live counter, FAQ accordion
   ============================================================= */

(function () {
  'use strict';

  const DEPT_LABELS = {
    reservations: 'Reservations & Bookings',
    concierge: 'Concierge Services',
    events: 'Events & Weddings',
    dining: 'Dining Reservations',
    spa: 'Spa & Wellness',
    corporate: 'Corporate & Business',
    feedback: 'Feedback & Compliments',
    other: 'Other Enquiry',
  };

  function initForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const alertBox = document.getElementById('contactAlert');
    const messageField = document.getElementById('cMessage');
    const counter = document.getElementById('cMessageCount');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Live character counter
    if (messageField && counter) {
      const updateCount = () => {
        counter.textContent = messageField.value.length;
      };
      messageField.addEventListener('input', updateCount);
      updateCount();
    }

    // Prefill subject from URL query (?subject=...)
    const params = new URLSearchParams(window.location.search);
    const preSubject = params.get('subject');
    if (preSubject) {
      const subjectField = document.getElementById('cSubject');
      if (subjectField && !subjectField.value) subjectField.value = preSubject;
    }
    const preDept = params.get('department');
    if (preDept) {
      const deptField = document.getElementById('cDepartment');
      if (deptField) deptField.value = preDept;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.innerHTML = '';

      const fd = Object.fromEntries(new FormData(form).entries());

      // Validate
      const errors = [];
      if (!fd.name || fd.name.trim().length < 2) errors.push('Please enter your full name.');
      if (!/^\S+@\S+\.\S+$/.test(fd.email || '')) errors.push('Please enter a valid email address.');
      if (fd.phone && fd.phone.replace(/\D/g, '').length < 7) errors.push('Please enter a valid phone number.');
      if (!fd.department) errors.push('Please choose a department.');
      if (!fd.subject || fd.subject.trim().length < 3) errors.push('Please enter a subject.');
      if (!fd.message || fd.message.trim().length < 10) errors.push('Your message must be at least 10 characters.');
      if (!document.getElementById('cConsent').checked) errors.push('Please provide consent to send your message.');

      if (errors.length) {
        showAlert(errors.map((e) => `• ${e}`).join('<br/>'), 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Sending…</span>';

      try {
        const departmentLabel = DEPT_LABELS[fd.department] || fd.department;
        await apiRequest('/contact', {
          method: 'POST',
          body: JSON.stringify({
            name: fd.name.trim(),
            email: fd.email.trim(),
            phone: (fd.phone || '').trim(),
            subject: `[${departmentLabel}] ${fd.subject.trim()}`,
            message: `Priority: ${fd.priority || 'normal'}\n\n${fd.message.trim()}`,
          }),
        });

        showAlert(
          `<strong>Thank you for your message.</strong><br/>A member of our ${departmentLabel.toLowerCase()} team will respond within 24 hours.`,
          'success'
        );
        form.reset();
        if (counter) counter.textContent = '0';
      } catch (err) {
        showAlert(err.message || 'We could not send your message. Please try again.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  function showAlert(msg, type) {
    const box = document.getElementById('contactAlert');
    if (!box) return;
    box.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function initFaq() {
    document.querySelectorAll('.faq-item').forEach((item) => {
      const btn = item.querySelector('.faq-question');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initForm();
    initFaq();
  });
})();