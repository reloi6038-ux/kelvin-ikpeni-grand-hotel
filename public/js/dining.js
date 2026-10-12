/* =============================================================
   Dining page — menu tab switching
   ============================================================= */

(function () {
  'use strict';

  function initMenuTabs() {
    const tabs = document.querySelectorAll('.menu-tab');
    const panels = document.querySelectorAll('.menu-panel');
    if (!tabs.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-menu');

        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        panels.forEach((p) => {
          p.style.display = p.getAttribute('data-panel') === target ? 'block' : 'none';
        });
      });
    });

    // Activate first tab
    if (tabs[0] && !document.querySelector('.menu-tab.active')) {
      tabs[0].click();
    }
  }

  document.addEventListener('DOMContentLoaded', initMenuTabs);
})();