console.log("Background script loaded.");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyzeSelection",
    title: "Analyze selection for misinformation",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyzeSelection") {
    chrome.storage.local.set({ selectedText: info.selectionText, url: tab.url }, () => {
      chrome.tabs.sendMessage(tab.id, { action: "showSidebarAndAnalyze" });
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startCapture') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      chrome.storage.local.set({ url: tab.url }, () => {
        chrome.tabs.sendMessage(tab.id, { action: 'startCapture' });
      });
    });
  } else if (request.action === 'capture') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      chrome.tabs.sendMessage(sender.tab.id, { action: 'capturedScreenshot', dataUrl: dataUrl, rect: request.rect });
    });
  }
});