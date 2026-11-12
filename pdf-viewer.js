// PDF Viewer Module
// Handles all PDF loading and rendering functionality

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentPdfDoc = null;
let currentPage = 1;
let currentZoom = 1;
let mobileTwoUp = false;
let pdfTitle = '';

// PDF cache for fast navigation (keep last 3 PDFs)
const pdfCache = new Map();
const MAX_CACHE_SIZE = 3;

// Mobile rendering state
let renderGen = 0;
let mobileObserver = null;
const activeTasks = new Set();

const isMobileView = () => window.innerWidth <= 768;

function teardownMobile(container) {
  renderGen++;
  if (mobileObserver) { mobileObserver.disconnect(); mobileObserver = null; }
  activeTasks.forEach(t => { try { t.cancel(); } catch (e) {} });
  activeTasks.clear();
  if (container) {
    container.querySelectorAll('canvas').forEach(c => { c.width = 0; c.height = 0; });
    Array.from(container.children).forEach(child => {
      if (child.id !== 'pdf-loading') child.remove();
    });
  }
}

function releaseSlot(slot) {
  if (slot.canvas) {
    slot.canvas.width = 0;
    slot.canvas.height = 0;
    slot.canvas.remove();
    slot.canvas = null;
  }
  slot.state = 'empty';
}

async function renderMobilePage(slot, doc, gen) {
  if (slot.state !== 'empty') return;
  slot.state = 'rendering';
  try {
    const page = await doc.getPage(slot.num);
    if (gen !== renderGen) return;

    const availableWidth = document.getElementById('pdf-container').clientWidth - 40;
    const base = page.getViewport({ scale: 1 });
    const correctCssScale = (availableWidth / base.width) * currentZoom;

    if (slot.cssScale !== correctCssScale) {
      slot.el.style.width = base.width * correctCssScale + 'px';
      slot.el.style.height = base.height * correctCssScale + 'px';
      slot.cssScale = correctCssScale;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: slot.cssScale * dpr });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    const task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
    activeTasks.add(task);
    try { await task.promise; } finally { activeTasks.delete(task); }

    if (gen !== renderGen) { canvas.width = canvas.height = 0; return; }
    slot.el.appendChild(canvas);
    slot.canvas = canvas;
    slot.state = 'done';
  } catch (err) {
    if (err?.name !== 'RenderingCancelledException') console.error('Page render error:', err);
    slot.state = 'empty';
  }
}

const pageSizeCache = new WeakMap();

async function getPageSizes(doc, gen) {
  if (pageSizeCache.has(doc)) return pageSizeCache.get(doc);
  const sizes = new Array(doc.numPages);
  const CHUNK = 40;
  for (let start = 1; start <= doc.numPages; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, doc.numPages);
    const nums = [];
    for (let p = start; p <= end; p++) nums.push(p);
    const pages = await Promise.all(nums.map(p => doc.getPage(p)));
    pages.forEach((pg, i) => {
      const v = pg.getViewport({ scale: 1 });
      sizes[nums[i] - 1] = { width: v.width, height: v.height };
    });
    if (gen !== renderGen) return sizes.map(s => s || sizes[0]);
  }
  pageSizeCache.set(doc, sizes);
  return sizes;
}

// Moves container's scroll so el's top meets the container's top, using measured rects only (robust to CSS zoom).
function alignToElement(container, el) {
  let k = 1;
  for (let i = 0; i < 8; i++) {
    const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    if (Math.abs(delta) < 1) break;
    const rectBefore = el.getBoundingClientRect().top;
    const stBefore = container.scrollTop;
    container.scrollTop = stBefore + delta / k;
    const applied = container.scrollTop - stBefore;
    if (!applied) break;
    const moved = rectBefore - el.getBoundingClientRect().top;
    if (moved) k = moved / applied;
  }
}

async function renderMobileVerticalScroll() {
  if (!currentPdfDoc) return;
  const container = document.getElementById('pdf-container');
  if (!container) return;

  teardownMobile(container);
  const gen = renderGen;
  const doc = currentPdfDoc;

  try {
    container.style.overflow = 'auto';
    container.style.overflowAnchor = 'none';
    container.style.justifyContent = 'flex-start';
    container.scrollTop = 0;

    const availableWidth = container.clientWidth - 40;
    const slots = [];

    const pagePromises = [];
    for (let p = 1; p <= Math.min(doc.numPages, 1); p++) {
      pagePromises.push(doc.getPage(p));
    }
    const firstPages = await Promise.all(pagePromises);
    if (gen !== renderGen) return;

    const refBase = firstPages[0].getViewport({ scale: 1 });

    // When jumping, size every slot to its true page size up front so nothing resizes (and shifts layout) after we scroll.
    const sizes = currentPage > 1 ? await getPageSizes(doc, gen) : null;
    if (gen !== renderGen) return;

    for (let p = 1; p <= doc.numPages; p++) {
      const base = sizes ? sizes[p - 1] : refBase;
      const cssScale = (availableWidth / base.width) * currentZoom;

      const el = document.createElement('div');
      el.style.width = base.width * cssScale + 'px';
      el.style.height = base.height * cssScale + 'px';
      el.style.margin = '0 auto 20px';
      el.style.flexShrink = '0';
      el.style.border = '1px solid #333';
      el.style.background = '#1a1a1a';
      container.appendChild(el);

      const slot = { num: p, el, cssScale, state: 'empty', canvas: null };
      el._slot = slot;
      slots.push(slot);
    }

    mobileObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const slot = entry.target._slot;
        if (entry.isIntersecting) renderMobilePage(slot, doc, gen);
        else if (slot.state === 'done') releaseSlot(slot);
      }
    }, { root: container, rootMargin: '150% 0px' });

    slots.forEach(s => mobileObserver.observe(s.el));

    if (currentPage > 1 && currentPage <= slots.length) {
      alignToElement(container, slots[currentPage - 1].el);
    }

    // Only pre-render page 1 if we're actually jumping to page 1
    if (currentPage === 1) {
      renderMobilePage(slots[0], doc, gen);
    }

    const pageInfo = document.getElementById('pdf-page-info');
    if (pageInfo) pageInfo.textContent = `${doc.numPages} pages`;
    const zoomLevel = document.getElementById('pdf-zoom-level');
    if (zoomLevel) zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
  } catch (err) {
    console.error('Mobile render error:', err);
  }
}

async function renderDesktopSpread() {
  if (!currentPdfDoc) return;

  const container = document.getElementById('pdf-container');
  if (!container) return;
  container.style.overflowX = 'auto';
  container.style.overflowY = 'hidden';

  // Update slider
  const slider = document.getElementById('pdf-slider');
  slider.max = currentPdfDoc.numPages;
  slider.value = currentPage;

  // Clear container
  Array.from(container.children).forEach(child => {
    if (child.id !== 'pdf-loading') child.remove();
  });

  const spreadDiv = document.createElement('div');
  spreadDiv.style.display = 'flex';
  spreadDiv.style.gap = '0px';
  spreadDiv.style.justifyContent = 'center';
  spreadDiv.style.alignItems = 'flex-start';

  // Create canvases for two-page spread
  const canvas1 = document.createElement('canvas');
  const canvas2 = document.createElement('canvas');

  canvas1.style.maxHeight = isMobileView() ? 'none' : '80vh';
  canvas1.style.width = 'auto';
  canvas2.style.maxHeight = isMobileView() ? 'none' : '80vh';
  canvas2.style.width = 'auto';
  canvas2.style.display = 'none';

  spreadDiv.appendChild(canvas1);
  spreadDiv.appendChild(canvas2);
  container.appendChild(spreadDiv);

  // Cover page (page 1) displayed alone
  if (currentPage === 1) {
    await renderPdfCanvasDesktop(canvas1, 1);
    document.getElementById('pdf-page-info').textContent = `Page 1 of ${currentPdfDoc.numPages}`;
  } else {
    // Spreads: pages 2-3, 4-5, 6-7, etc.
    await renderPdfCanvasDesktop(canvas1, currentPage);
    canvas2.style.display = 'block';
    await renderPdfCanvasDesktop(canvas2, currentPage + 1);
    const endPage = Math.min(currentPage + 1, currentPdfDoc.numPages);
    document.getElementById('pdf-page-info').textContent = `Pages ${currentPage}-${endPage} of ${currentPdfDoc.numPages}`;
  }

  document.getElementById('pdf-zoom-level').textContent = Math.round(currentZoom * 100) + '%';

  if (isMobileView()) fitAppToSpread(spreadDiv);
}

// Mobile two-page view: size the .app viewer row to the spread instead of filling all leftover height.
function fitAppToSpread(spreadDiv) {
  const app = document.querySelector('.app');
  const container = document.getElementById('pdf-container');
  const viewerWrap = document.getElementById('viewer-wrap');
  if (!app || !container || !viewerWrap) return;
  const chrome = viewerWrap.offsetHeight - container.offsetHeight;
  const rowHeight = Math.ceil(spreadDiv.offsetHeight + chrome);
  app.style.gridTemplateRows = `auto minmax(0, ${rowHeight}px) minmax(0, 1fr)`;
}

function resetAppRows() {
  const app = document.querySelector('.app');
  if (app) app.style.gridTemplateRows = '';
}

async function renderPdfCanvasDesktop(canvas, pageNum) {
  if (!currentPdfDoc || pageNum > currentPdfDoc.numPages || pageNum < 1) return;

  const page = await currentPdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });

  // Display scale to fit in viewport - use container height, not window height
  const container = document.getElementById('pdf-container');
  const maxHeight = container ? container.clientHeight * 0.95 : window.innerHeight * 0.8;
  let scaleToFit = maxHeight / viewport.height;
  if (isMobileView() && container) {
    // Mobile: fit both pages to the width; the viewer row then grows/shrinks to the result
    scaleToFit = (container.clientWidth * 0.98) / (viewport.width * 2);
  }
  const displayScale = scaleToFit * currentZoom;

  // Render at 2x resolution for quality
  const renderScale = displayScale * 2;

  const displayViewport = page.getViewport({ scale: displayScale });
  const renderViewport = page.getViewport({ scale: renderScale });

  const ctx = canvas.getContext('2d');
  // High-resolution internal buffer
  canvas.width = renderViewport.width;
  canvas.height = renderViewport.height;

  // Display at fitted size
  canvas.style.width = displayViewport.width + 'px';
  canvas.style.height = displayViewport.height + 'px';

  const renderContext = { canvasContext: ctx, viewport: renderViewport };
  await page.render(renderContext).promise;
}

async function renderPdfPage() {
  if (!currentPdfDoc) return;

  const isMobile = isMobileView();
  const controls = document.getElementById('pdf-controls');
  const toggle = document.getElementById('pdf-view-toggle');
  if (toggle) {
    toggle.style.display = isMobile ? 'inline-block' : 'none';
    toggle.textContent = mobileTwoUp ? '1-page' : '2-page';
  }

  if (isMobile && !mobileTwoUp) {
    resetAppRows();
    if (controls) controls.style.display = 'none';
    await renderMobileVerticalScroll();
  } else {
    teardownMobile(document.getElementById('pdf-container'));
    if (!isMobile) resetAppRows();
    if (controls) controls.style.display = 'flex';
    await renderDesktopSpread();
  }
}

document.getElementById('pdf-view-toggle')?.addEventListener('click', () => {
  mobileTwoUp = !mobileTwoUp;
  renderPdfPage();
});

// Event Listeners
document.getElementById('pdf-prev')?.addEventListener('click', () => {
  if (currentPage > 1) {
    if (currentPage === 2) {
      currentPage = 1; // From page 2 (first spread), go to cover
    } else {
      currentPage = Math.max(2, currentPage - 2); // From spreads, go back 2 pages
    }
    renderPdfPage();
  }
});

document.getElementById('pdf-next')?.addEventListener('click', () => {
  if (currentPage < currentPdfDoc.numPages) {
    if (currentPage === 1) {
      currentPage = 2; // From cover, go to first spread
    } else {
      currentPage = Math.min(currentPdfDoc.numPages - 1, currentPage + 2); // From spreads, go forward 2 pages
    }
    renderPdfPage();
  }
});

document.getElementById('pdf-slider')?.addEventListener('input', (e) => {
  currentPage = Math.max(1, parseInt(e.target.value));
  renderPdfPage();
});

document.getElementById('pdf-zoom-in')?.addEventListener('click', () => {
  currentZoom = Math.min(currentZoom + 0.2, 3);
  renderPdfPage();
});

document.getElementById('pdf-zoom-out')?.addEventListener('click', () => {
  currentZoom = Math.max(currentZoom - 0.2, 0.5);
  renderPdfPage();
});

function getCachedPdf(url) {
  return pdfCache.get(url);
}

function setCachedPdf(url, doc) {
  if (pdfCache.size >= MAX_CACHE_SIZE) {
    const firstKey = pdfCache.keys().next().value;
    pdfCache.delete(firstKey);
  }
  pdfCache.set(url, doc);
}

function prefetchPdf(url) {
  if (!url || pdfCache.has(url)) return;
  pdfjsLib.getDocument(url).promise.then(doc => {
    setCachedPdf(url, doc);
  }).catch(() => {});
}

async function loadPdf(url, title) {
  try {
    // Show loading indicator
    const loading = document.getElementById('pdf-loading');
    if (loading) loading.style.display = 'block';

    // Clean up previous PDF's DOM only, don't destroy (keep in cache)
    const container = document.getElementById('pdf-container');
    teardownMobile(container);

    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 10));

    if (container) {
      // Clear only the canvases, keep the loading indicator
      Array.from(container.children).forEach(child => {
        if (child.id !== 'pdf-loading') child.remove();
      });
    }

    const cached = getCachedPdf(url);
    if (cached) {
      currentPdfDoc = cached;
    } else {
      currentPdfDoc = await pdfjsLib.getDocument(url).promise;
      setCachedPdf(url, currentPdfDoc);
    }
    currentPage = 1;
    currentZoom = 1;
    pdfTitle = title;

    const titleEl = document.getElementById('pdf-title');
    if (titleEl) titleEl.textContent = title;

    const pdfViewer = document.getElementById('pdf-viewer');
    if (pdfViewer) pdfViewer.style.display = 'flex';

    await renderPdfPage();

    // Hide loading indicator when done
    if (loading) loading.style.display = 'none';
  } catch (err) {
    console.error('PDF loading error:', err);

    const pdfViewer = document.getElementById('pdf-viewer');
    if (pdfViewer) pdfViewer.style.display = 'none';

    const viewerWrap = document.getElementById('viewer-wrap');
    if (viewerWrap) {
      viewerWrap.innerHTML = `
        <div style="padding:20px; color:#a8a8a8; background:#111; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
          <div style="font-size:14px; margin-bottom:20px;">PDF viewer requires HTTPS or Brave browser</div>
          <a href="${url}" target="_blank" style="padding:10px 20px; background:#1f1f1f; color:#f2f2f2; text-decoration:none; border:1px solid #333; border-radius:2px; display:inline-block;">Open PDF in New Tab</a>
          <div style="font-size:12px; color:#666; margin-top:10px;">For best viewing experience</div>
        </div>
      `;
    }
  }
}
