chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'flip-layout') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'flipLayout' });
  } catch (_) {
    // Tab may not have a content script (e.g. chrome:// pages)
  }
});
