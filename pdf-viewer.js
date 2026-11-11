// PDF Viewer Module
// Handles all PDF loading and rendering functionality

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let currentPdfDoc = null;
let currentPage = 1;
let currentZoom = 1;
let pdfTitle = '';

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
    for (let p = 1; p <= Math.min(doc.numPages, 10); p++) {
      pagePromises.push(doc.getPage(p));
    }
    const firstPages = await Promise.all(pagePromises);
    if (gen !== renderGen) return;

    for (let p = 1; p <= doc.numPages; p++) {
      const page = p <= firstPages.length ? firstPages[p - 1] : null;
      const cssScale = page ? (availableWidth / page.getViewport({ scale: 1 }).width) * currentZoom : 1;

      const el = document.createElement('div');
      el.style.width = page ? page.getViewport({ scale: 1 }).width * cssScale + 'px' : availableWidth + 'px';
      el.style.height = page ? page.getViewport({ scale: 1 }).height * cssScale + 'px' : '400px';
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

    for (let i = 0; i < Math.min(3, slots.length); i++) {
      renderMobilePage(slots[i], doc, gen);
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
  container.style.overflow = 'hidden';
  container.style.justifyContent = 'center';
  const isMobile = isMobileView();

  // Update slider
  const slider = document.getElementById('pdf-slider');
  slider.max = currentPdfDoc.numPages;
  slider.value = currentPage;

  // Clear container
  container.innerHTML = '';

  const spreadDiv = document.createElement('div');
  spreadDiv.style.display = 'flex';
  spreadDiv.style.gap = '20px';
  spreadDiv.style.justifyContent = 'center';
  spreadDiv.style.alignItems = 'flex-start';

  // Create canvases for two-page spread
  const canvas1 = document.createElement('canvas');
  const canvas2 = document.createElement('canvas');

  canvas1.style.maxHeight = '80vh';
  canvas1.style.width = 'auto';
  canvas2.style.maxHeight = '80vh';
  canvas2.style.width = 'auto';
  canvas2.style.display = 'none';

  spreadDiv.appendChild(canvas1);
  spreadDiv.appendChild(canvas2);
  container.appendChild(spreadDiv);

  // Render pages
  await renderPdfCanvasDesktop(canvas1, currentPage);
  if (!isMobile) {
    canvas2.style.display = 'block';
    await renderPdfCanvasDesktop(canvas2, currentPage + 1);
    const endPage = Math.min(currentPage + 1, currentPdfDoc.numPages);
    document.getElementById('pdf-page-info').textContent = `Pages ${currentPage}-${endPage} of ${currentPdfDoc.numPages}`;
  } else {
    document.getElementById('pdf-page-info').textContent = `Page ${currentPage} of ${currentPdfDoc.numPages}`;
  }

  document.getElementById('pdf-zoom-level').textContent = Math.round(currentZoom * 100) + '%';
}

async function renderPdfCanvasDesktop(canvas, pageNum) {
  if (!currentPdfDoc || pageNum > currentPdfDoc.numPages || pageNum < 1) return;

  const page = await currentPdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1 });

  // Display scale to fit in viewport
  const maxHeight = Math.min(window.innerHeight * 0.67, 700);
  const scaleToFitHeight = maxHeight / viewport.height;
  const displayScale = scaleToFitHeight * currentZoom;

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

  if (isMobile) {
    if (controls) controls.style.display = 'none';
    await renderMobileVerticalScroll();
  } else {
    if (controls) controls.style.display = 'flex';
    await renderDesktopSpread();
  }
}

// Event Listeners
document.getElementById('pdf-prev')?.addEventListener('click', () => {
  const pageSize = 2;
  if (currentPage > 1) {
    currentPage = Math.max(1, currentPage - pageSize);
    renderPdfPage();
  }
});

document.getElementById('pdf-next')?.addEventListener('click', () => {
  const pageSize = 2;
  if (currentPage < currentPdfDoc.numPages) {
    currentPage = Math.min(currentPdfDoc.numPages - 1, currentPage + pageSize);
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

async function loadPdf(url, title) {
  try {
    // Show loading indicator
    const loading = document.getElementById('pdf-loading');
    if (loading) loading.style.display = 'block';

    // Clean up previous PDF
    const container = document.getElementById('pdf-container');
    teardownMobile(container);
    if (currentPdfDoc) {
      try { await currentPdfDoc.destroy(); } catch (e) {}
      currentPdfDoc = null;
    }

    // Small delay to ensure cleanup completes
    await new Promise(resolve => setTimeout(resolve, 10));

    if (container) {
      // Clear only the canvases, keep the loading indicator
      Array.from(container.children).forEach(child => {
        if (child.id !== 'pdf-loading') child.remove();
      });
    }

    currentPdfDoc = await pdfjsLib.getDocument(url).promise;
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
