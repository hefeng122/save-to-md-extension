// MV3 service worker: inject content script on click and handle downloads

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
  } catch (e) {
    console.error("Failed to inject content.js", e);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "SAVE_MD") {
    const { filename, markdown } = message;
    const dataUrl = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);
    chrome.downloads.download({ url: dataUrl, filename, saveAs: true });
    sendResponse({ ok: true });
  }
  // returning true indicates async sendResponse possible, but we respond synchronously here
});

