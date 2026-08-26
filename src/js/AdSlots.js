// AdSlots.js - Responsive visibility logic for ad slots
// Exposes: window.AdSlots.updateVisibility()

window.AdSlots = {
  /**
   * Updates visibility of ad slots based on viewport dimensions and content margins.
   * Should be called on load and resize events.
   */
  updateVisibility: function() {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    const root = document.getElementById('root');
    if (!root) return;

    const rootRect = root.getBoundingClientRect();
    const rootWidth = rootRect.width;
    const horizontalMargin = (vw - rootWidth) / 2;

    // Vertical slots: show when viewport width >= 1200px AND horizontal margin >= 160px on each side
    const verticalSlots = document.querySelectorAll('.ad-slot.vertical');
    const showVertical = vw >= 1200 && horizontalMargin >= 160;
    verticalSlots.forEach(slot => {
      slot.classList.toggle('visible', showVertical);
    });

    // Horizontal slot: show when viewport height allows it below button bar without pushing content below fold
    // Using viewport height >= 800px as a reasonable approximation (adjust as needed)
    const horizontalSlot = document.querySelector('.ad-slot.horizontal');
    const showHorizontal = vh >= 800;
    horizontalSlot.classList.toggle('visible', showHorizontal);

    // Set margins on root to accommodate visible slots
    if (showVertical) {
      root.style.marginLeft = '160px';
      root.style.marginRight = '160px';
    } else {
      root.style.marginLeft = '0';
      root.style.marginRight = '0';
    }

    if (showHorizontal) {
      root.style.marginBottom = '90px'; // matches horizontal slot height
    } else {
      root.style.marginBottom = '0';
    }
  }
};