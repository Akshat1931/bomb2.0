/**
 * Universal Drag-and-Drop & Clipboard Helper for KTANE Solver
 * Supports local image/video files, Discord CDN URLs (via CORS proxy),
 * cross-tab image drops, and automatic background drop routing.
 */

(function () {
  'use strict';

  function extractImageUrl(textOrHtml) {
    if (!textOrHtml || typeof textOrHtml !== 'string') return null;
    const str = textOrHtml.trim();

    // Check for <img> tag src
    const imgMatch = str.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) return imgMatch[1];

    // Check for standard URL
    const urlMatch = str.match(/https?:\/\/[^\s<>"')]+/i);
    if (urlMatch) {
      const u = urlMatch[0];
      if (
        /\.(png|jpe?g|webp|gif|bmp|svg|mp4|webm|mov)(\?.*)?$/i.test(u) ||
        u.includes('discordapp.') ||
        u.includes('discord.com') ||
        u.includes('imgur.com')
      ) {
        return u;
      }
    }
    return null;
  }

  function fetchImageBlob(url, onSuccess, onError) {
    const isDiscord =
      url.includes('discordapp.com') ||
      url.includes('discordapp.net') ||
      url.includes('discord.com');

    const proxyUrl = isDiscord
      ? '/api/imgproxy?url=' + encodeURIComponent(url)
      : url;

    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Fetch status ' + res.status);
        return res.blob();
      })
      .then((blob) => {
        const file = new File([blob], 'dropped_image.png', {
          type: blob.type || 'image/png',
        });
        const img = new Image();
        img.onload = () => onSuccess(file, img);
        img.onerror = () => onSuccess(file, null);
        img.src = URL.createObjectURL(blob);
      })
      .catch((err) => {
        // If proxy failed on Discord, try direct fetch
        if (isDiscord) {
          fetch(url)
            .then((r) => {
              if (!r.ok) throw new Error();
              return r.blob();
            })
            .then((b) => {
              const file = new File([b], 'dropped_image.png', {
                type: b.type || 'image/png',
              });
              const img = new Image();
              img.onload = () => onSuccess(file, img);
              img.onerror = () => onSuccess(file, null);
              img.src = URL.createObjectURL(b);
            })
            .catch(() => fallbackDirectImage(url, onSuccess, onError));
        } else {
          fallbackDirectImage(url, onSuccess, onError);
        }
      });
  }

  function fallbackDirectImage(src, onSuccess, onError) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Convert to blob via canvas if possible
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          const file = blob
            ? new File([blob], 'image.png', { type: blob.type || 'image/png' })
            : null;
          onSuccess(file, img);
        });
      } catch (e) {
        onSuccess(null, img);
      }
    };
    img.onerror = () => {
      const img2 = new Image();
      img2.onload = () => onSuccess(null, img2);
      img2.onerror = (e) => {
        if (onError) onError(e);
      };
      img2.src = src;
    };
    img.src = src;
  }

  function handleDataTransfer(dataTransfer, callback) {
    if (!dataTransfer) return;

    // 1. Check dataTransfer.files
    const files = dataTransfer.files;
    if (files && files.length > 0) {
      // Find image or video file
      const f =
        [...files].find(
          (file) =>
            file.type.startsWith('image/') ||
            file.type.startsWith('video/') ||
            /\.(png|jpe?g|webp|gif|bmp|svg|mp4|webm|mov)$/i.test(file.name)
        ) || files[0];

      if (f) {
        if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|svg)$/i.test(f.name)) {
          const blobUrl = URL.createObjectURL(f);
          const img = new Image();
          img.onload = () => callback(f, img);
          img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            tryUrlFallback();
          };
          img.src = blobUrl;
          return;
        } else {
          // Video / GIF or other media (e.g. for Morse code)
          callback(f, null);
          return;
        }
      }
    }

    // 2. Check dataTransfer.items
    const items = dataTransfer.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) {
            const img = new Image();
            img.onload = () => callback(f, img);
            img.src = URL.createObjectURL(f);
            return;
          }
        }
      }
    }

    tryUrlFallback();

    // 3. Fallback: extract URL from text/uri-list, text/plain, or text/html
    function tryUrlFallback() {
      const uriList = dataTransfer.getData('text/uri-list');
      const textPlain = dataTransfer.getData('text/plain');
      const textHtml = dataTransfer.getData('text/html');

      const url =
        extractImageUrl(uriList) ||
        extractImageUrl(textPlain) ||
        extractImageUrl(textHtml);

      if (url) {
        fetchImageBlob(
          url,
          (file, img) => callback(file, img),
          (err) => console.warn('Could not load dropped URL:', err)
        );
      }
    }
  }

  function feedFileToInput(fileInputEl, file) {
    if (!fileInputEl || !file) return false;
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputEl.files = dt.files;
      fileInputEl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (e) {
      console.warn('feedFileToInput error:', e);
      return false;
    }
  }

  function getActiveSection() {
    const active = document.querySelector('.page-section.active');
    return active ? active.id : null;
  }

  function routeDropToActiveModule(dataTransfer) {
    const secId = getActiveSection();
    if (!secId) return;

    handleDataTransfer(dataTransfer, (file, img) => {
      if (!file && !img) return;

      switch (secId) {
        case 'solverSection': {
          // Check if multi-maze is open
          const multiView = document.getElementById('multiMazeView');
          if (multiView && multiView.style.display !== 'none') {
            // Multi-maze active
            const masterMaze = document.getElementById('multiMazeDropzone');
            if (masterMaze && img && typeof window.multiMazeOnFileLoaded === 'function') {
              // Feed to master maze
            }
          } else {
            // Single maze active
            const slot = window.pasteTargetSlot === 2 ? 2 : 1;
            const input = document.getElementById('file' + slot);
            if (file && input) feedFileToInput(input, file);
          }
          break;
        }
        case 'wiresSection': {
          const input = document.getElementById('wireFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'whosSection': {
          const input = document.getElementById('whosFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'vennSection': {
          const input = document.getElementById('vennFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'complexWiresSection': {
          const input = document.getElementById('cwDiagramFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'buttonSection': {
          const input = document.getElementById('buttonFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'morseSection': {
          const input = document.getElementById('morseFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'nqueenSection': {
          const input = document.getElementById('nqFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'chessSection': {
          const slot = window.chessState?.activePasteSlot || 1;
          const input = document.getElementById('chessFileInput' + slot);
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'minesweeperSection': {
          const input = document.getElementById('msFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'symbolsSection': {
          const target = window.symbolsModuleState?.activeTarget || 'mod';
          let input = null;
          if (target === 'mod') {
            input = document.getElementById('symModInput');
          } else if (target.startsWith('ref')) {
            const idx = target.replace('ref', '');
            input = document.getElementById('symRefInput-' + idx);
          }
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'circuitSection': {
          const input = document.getElementById('cktLegendFile');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'limboSection': {
          const input = document.getElementById('limboFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'pipesSection': {
          const input = document.getElementById('pipesFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'astrologySection': {
          const input = document.getElementById('astrologyFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
        case 'hangmanSection': {
          const input = document.getElementById('hangmanFileInput');
          if (file && input) feedFileToInput(input, file);
          break;
        }
      }
    });
  }

  // ── ATTACH TO SPECIFIC DROPZONES ─────────────────────────────────
  function attachDropzone(elementOrId, onLoaded) {
    const el =
      typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;
    if (!el) return;

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('active', 'dragover');
      if (!el.style.borderColor) el.dataset.prevBorder = el.style.borderColor;
      el.style.borderColor = '#f5c542';
    });

    el.addEventListener('dragleave', (e) => {
      e.preventDefault();
      el.classList.remove('active', 'dragover');
      el.style.borderColor = el.dataset.prevBorder || '';
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Stop document bubble so we don't double process
      el.classList.remove('active', 'dragover');
      el.style.borderColor = el.dataset.prevBorder || '';

      handleDataTransfer(e.dataTransfer, (file, img) => {
        if (onLoaded) {
          onLoaded(file, img);
        }
      });
    });
  }

  // ── INIT ALL MODULE DROPZONES ────────────────────────────────────
  function initAllDropzones() {
    // Wires
    attachDropzone('wireDropzone', (file) => {
      feedFileToInput(document.getElementById('wireFileInput'), file);
    });

    // Who's on First
    attachDropzone('whosDropzone', (file) => {
      feedFileToInput(document.getElementById('whosFileInput'), file);
    });

    // Venn
    attachDropzone('vennDropzone', (file) => {
      feedFileToInput(document.getElementById('vennFileInput'), file);
    });

    // Complex Wires
    attachDropzone('cwDiagramDropzone', (file) => {
      feedFileToInput(document.getElementById('cwDiagramFileInput'), file);
    });

    // Button
    attachDropzone('buttonDropzone', (file) => {
      feedFileToInput(document.getElementById('buttonFileInput'), file);
    });

    // Morse
    attachDropzone('morseDropzone', (file) => {
      feedFileToInput(document.getElementById('morseFileInput'), file);
    });

    // N-Queens
    attachDropzone('nqDropZone', (file) => {
      feedFileToInput(document.getElementById('nqFileInput'), file);
    });

    // Chess Slot 1 & Slot 2
    attachDropzone('chessDropzone1', (file) => {
      feedFileToInput(document.getElementById('chessFileInput1'), file);
    });
    attachDropzone('chessDropzone2', (file) => {
      feedFileToInput(document.getElementById('chessFileInput2'), file);
    });

    // Minesweeper
    attachDropzone('msDropzone', (file) => {
      feedFileToInput(document.getElementById('msFileInput'), file);
    });

    // Symbols Module
    ['symRefSlot-0', 'symRefSlot-1', 'symRefSlot-2'].forEach((id, idx) => {
      attachDropzone(id, (file) => {
        feedFileToInput(document.getElementById('symRefInput-' + idx), file);
      });
    });
    attachDropzone('symModSlot', (file) => {
      feedFileToInput(document.getElementById('symModInput'), file);
    });

    // Single Maze boxes b1 and b2
    attachDropzone('b1', (file) => {
      feedFileToInput(document.getElementById('file1'), file);
    });
    attachDropzone('b2', (file) => {
      feedFileToInput(document.getElementById('file2'), file);
    });
  }

  // ── DOCUMENT-LEVEL GLOBAL SAFETY NET ─────────────────────────────
  // Crucial: calling preventDefault() on dragover prevents browser from opening
  // any dropped file or Discord link in a new tab!
  window.addEventListener(
    'dragover',
    function (e) {
      e.preventDefault();
    },
    false
  );

  window.addEventListener(
    'drop',
    function (e) {
      e.preventDefault();
      // If the drop reached document bubble phase, it landed on the page background
      routeDropToActiveModule(e.dataTransfer);
    },
    false
  );

  // ── GLOBAL PASTE SUPPORT FOR DISCORD LINKS ───────────────────────
  window.addEventListener(
    'paste',
    function (e) {
      // If clipboard contains plain text with image/Discord URL, route to active module
      const textPlain = e.clipboardData?.getData('text/plain');
      const textHtml = e.clipboardData?.getData('text/html');
      const url = extractImageUrl(textPlain) || extractImageUrl(textHtml);
      if (url) {
        routeDropToActiveModule(e.clipboardData);
      }
    },
    false
  );

  // Expose API
  window.BombDragDrop = {
    extractImageUrl,
    fetchImageBlob,
    handleDataTransfer,
    feedFileToInput,
    attachDropzone,
    initAllDropzones,
  };

  // Run init on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllDropzones);
  } else {
    setTimeout(initAllDropzones, 100);
  }
})();
