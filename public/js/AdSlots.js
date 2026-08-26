// AdSlots.js - Responsive visibility logic for ad slots
// Exposes: window.AdSlots.updateVisibility()

window.AdSlots = {
  /**
   * Updates visibility of ad slots based on viewport dimensions and content margins.
   * Should be called on load and resize events.
   * Also injects ad scripts when slots become visible (only once per slot).
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

    // Inject ad scripts for newly visible slots (only once per slot)
    this.injectAdScripts();
  },

  /**
   * Injects ad scripts into slots that are currently visible and haven't been injected yet.
   * Uses placeholder URLs if real ones not provided.
   */
  injectAdScripts: function() {
    // Track injected slots using a WeakSet to avoid memory leaks
    if (!window.AdSlots._injectedSlots) {
      window.AdSlots._injectedSlots = new WeakSet();
    }
    const injectedSlots = window.AdSlots._injectedSlots;

    // Define ad script URLs (placeholders)
    const adScripts = {
      'vertical-top':   '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-vert1-placeholder" crossorigin="anonymous"></script>',
      'vertical-bottom': '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-vert2-placeholder" crossorigin="anonymous"></script>',
      'horizontal':     '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-horiz1-placeholder" crossorigin="anonymous"></script>'
    };

    // Process all ad slots
    const slots = document.querySelectorAll('.ad-slot');
    slots.forEach(slot => {
      // Skip if already injected
      if (injectedSlots.has(slot)) return;

      // Skip if not currently visible
      if (!slot.classList.contains('visible')) return;

      const slotType = slot.dataset.slot;
      const scriptTag = adScripts[slotType];
      if (!scriptTag) {
        console.warn(`AdSlots: No ad script defined for slot type "${slotType}"`);
        return;
      }

      try {
        // Create script element from the tag string
        const scriptEl = document.createElement('script');
        scriptEl.async = true;

        // If the tag contains src, set it; otherwise set innerHTML (for inline scripts)
        const srcMatch = scriptTag.match(/src=["']([^"']+)["']/);
        if (srcMatch) {
          scriptEl.src = srcMatch[1];
          scriptEl.crossOrigin = 'anonymous';
        } else {
          // Extract the script content between <script> and </script>
          const scriptContent = scriptTag.replace(/<script[^>]*>|<\/script>/g, '');
          scriptEl.textContent = scriptContent;
        }

        // Add error handling so failing ad scripts don't break page JS
        scriptEl.onerror = function(e) {
          console.warn(`AdSlots: Failed to load ad script for slot ${slotType}`, e);
        };

        // Append to slot
        slot.appendChild(scriptEl);

        // Mark as injected
        injectedSlots.add(slot);
      } catch (err) {
        console.error(`AdSlots: Error injecting ad script for slot ${slotType}`, err);
      }
    });
  }
};