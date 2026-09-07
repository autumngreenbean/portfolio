// ============================================================================
// accessibility.js
// Small, dependency-free helpers used by game.js. Kept separate so the
// accessibility surface is easy to audit/extend on its own.
// ============================================================================

export function announce(liveRegionEl, message) {
  if (!liveRegionEl) return;
  // Clearing then re-setting forces most screen readers to re-announce even
  // if the text is identical to the previous message.
  liveRegionEl.textContent = "";
  requestAnimationFrame(() => {
    liveRegionEl.textContent = message;
  });
}

export function applyTheme(themeName) {
  document.documentElement.setAttribute("data-theme", themeName);
  try { localStorage.setItem(CONFIG.STORAGE_KEY + ":theme", themeName); } catch (_) {}
  return Theme.refresh();
}

export function loadSavedTheme(defaultTheme) {
  try {
    return localStorage.getItem(CONFIG.STORAGE_KEY + ":theme") || defaultTheme;
  } catch (_) {
    return defaultTheme;
  }
}

export function applyUIScale(scale) {
  const clamped = Math.min(CONFIG.A11Y.maxScale, Math.max(CONFIG.A11Y.minScale, scale));
  document.documentElement.style.setProperty("--scale", clamped.toFixed(2));
  try { localStorage.setItem(CONFIG.STORAGE_KEY + ":scale", String(clamped)); } catch (_) {}
  return clamped;
}

export function loadSavedScale(defaultScale) {
  try {
    const v = parseFloat(localStorage.getItem(CONFIG.STORAGE_KEY + ":scale"));
    return Number.isFinite(v) ? v : defaultScale;
  } catch (_) {
    return defaultScale;
  }
}

/** Minimal focus trap + return-focus for a modal dialog element. */
export function openDialog(dialogBackdropEl) {
  const previouslyFocused = document.activeElement;
  dialogBackdropEl.hidden = false;
  const focusable = dialogBackdropEl.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length) focusable[0].focus();

  function trap(e) {
    if (e.key === "Escape") {
      closeDialog(dialogBackdropEl, previouslyFocused);
      return;
    }
    if (e.key !== "Tab" || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  dialogBackdropEl._trapHandler = trap;
  dialogBackdropEl.addEventListener("keydown", trap);
}

export function closeDialog(dialogBackdropEl, restoreFocusTo) {
  dialogBackdropEl.hidden = true;
  if (dialogBackdropEl._trapHandler) {
    dialogBackdropEl.removeEventListener("keydown", dialogBackdropEl._trapHandler);
    dialogBackdropEl._trapHandler = null;
  }
  if (restoreFocusTo && restoreFocusTo.focus) restoreFocusTo.focus();
}
