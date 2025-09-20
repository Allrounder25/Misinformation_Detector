let sidebar;

function showSidebar(callback) {
  if (sidebar) {
    if (callback) callback();
    return;
  }

  sidebar = document.createElement('iframe');
  sidebar.id = 'misinformation-detector-sidebar';
  sidebar.src = chrome.runtime.getURL('sidebar.html');
  sidebar.style.position = 'fixed';
  sidebar.style.top = '0';
  sidebar.style.right = '0';
  sidebar.style.width = '350px';
  sidebar.style.height = '100%';
  sidebar.style.border = '1px solid #ccc';
  sidebar.style.zIndex = '999999';
  sidebar.style.backgroundColor = 'white';

  sidebar.onload = () => {
    if (callback) callback();
  };

  document.body.appendChild(sidebar);
}

function hideSidebar() {
  if (sidebar) {
    sidebar.remove();
    sidebar = null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleSidebar') {
    if (sidebar) {
      hideSidebar();
    } else {
      showSidebar();
    }
  } else if (request.action === 'showSidebarAndAnalyze') {
    showSidebar(() => {
      if (sidebar && sidebar.contentWindow) {
        sidebar.contentWindow.postMessage({ action: 'analyze' }, '*');
      }
    });
  } else if (request.action === 'startCapture') {
    startCaptureMode();
  } else if (request.action === 'capturedScreenshot') {
    cropAndSend(request.dataUrl, request.rect);
  }
});

function startCaptureMode() {
  const overlay = document.createElement('div');
  overlay.id = 'capture-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '9999999';
  overlay.style.cursor = 'crosshair';

  document.body.appendChild(overlay);

  let startX, startY, endX, endY;
  const selectionBox = document.createElement('div');
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed #fff';
  selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  overlay.appendChild(selectionBox);

  overlay.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!startX || !startY) return;
    endX = e.clientX;
    endY = e.clientY;
    selectionBox.style.width = `${Math.abs(endX - startX)}px`;
    selectionBox.style.height = `${Math.abs(endY - startY)}px`;
    selectionBox.style.left = `${Math.min(startX, endX)}px`;
    selectionBox.style.top = `${Math.min(startY, endY)}px`;
  });

  overlay.addEventListener('mouseup', (e) => {
    if (!startX || !startY) return;
    endX = e.clientX;
    endY = e.clientY;
    overlay.remove();

    const rect = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    };

    chrome.runtime.sendMessage({ action: 'capture', rect: rect });
  });
}

function cropAndSend(dataUrl, rect) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = () => {
    canvas.width = rect.width;
    canvas.height = rect.height;
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const croppedImageData = canvas.toDataURL('image/png');
    if (sidebar && sidebar.contentWindow) {
      sidebar.contentWindow.postMessage({ action: 'capturedImageData', imageData: croppedImageData }, '*');
    }
  };

  img.src = dataUrl;
}
