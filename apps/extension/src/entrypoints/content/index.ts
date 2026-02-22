import React from 'react';
import { createRoot } from 'react-dom/client';
import { DecisionPopup } from '../components/InboxZero/DecisionPopup';
import type { TabInfo } from '../utils/types';

// Content script entry point for Inbox Zero Decision Popup
// This script is injected into every webpage and can render React components

console.log('[DTT Content] Inbox Zero content script loaded');

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showDecisionPopup') {
    showDecisionPopup(request.tab);
    sendResponse({ success: true });
  }
  return true;
});

function showDecisionPopup(tab: TabInfo) {
  // Check if popup already exists
  const existing = document.getElementById('dtt-decision-popup-root');
  if (existing) {
    console.log('[DTT Content] Popup already exists, skipping');
    return;
  }

  // Create container
  const container = document.createElement('div');
  container.id = 'dtt-decision-popup-root';
  
  // Style to ensure it's on top of everything
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483647;
    pointer-events: auto;
  `;
  
  document.body.appendChild(container);

  // Create shadow DOM for style isolation (optional but recommended)
  const shadowRoot = container.attachShadow({ mode: 'open' });
  
  // Add styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    /* Tailwind-like reset for the shadow DOM */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Ensure fonts are inherited or use system fonts */
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  `;
  shadowRoot.appendChild(styleSheet);

  // Create React root container inside shadow DOM
  const reactContainer = document.createElement('div');
  shadowRoot.appendChild(reactContainer);

  // Render React component
  const root = createRoot(reactContainer);
  
  root.render(
    React.createElement(DecisionPopup, {
      tab,
      onDecision: (decision) => {
        // Send decision back to background
        chrome.runtime.sendMessage({
          action: 'decisionMade',
          tabId: tab.id,
          decision
        });
        
        // Cleanup
        root.unmount();
        container.remove();
      },
      onClose: () => {
        // Default to close if no decision
        chrome.runtime.sendMessage({
          action: 'decisionMade',
          tabId: tab.id,
          decision: 'close'
        });
        
        // Cleanup
        root.unmount();
        container.remove();
      }
    })
  );
}

// Also listen for daily enforcement modal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showDailyEnforcement') {
    // Import and show daily enforcement
    import('../components/InboxZero/DailyEnforcement').then(({ DailyEnforcement }) => {
      const container = document.createElement('div');
      container.id = 'dtt-daily-enforcement-root';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
      `;
      document.body.appendChild(container);

      const shadowRoot = container.attachShadow({ mode: 'open' });
      const reactContainer = document.createElement('div');
      shadowRoot.appendChild(reactContainer);

      const root = createRoot(reactContainer);
      root.render(
        React.createElement(DailyEnforcement, {
          unreadTabs: request.unreadTabs,
          onComplete: () => {
            chrome.runtime.sendMessage({ action: 'dailyEnforcementComplete' });
            root.unmount();
            container.remove();
          },
          onSkip: () => {
            chrome.runtime.sendMessage({ action: 'dailyEnforcementSkipped' });
            root.unmount();
            container.remove();
          }
        })
      );
    });
    
    sendResponse({ success: true });
  }
  return true;
});

// Listen for tab limit modal
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showTabLimitModal') {
    import('../components/InboxZero/TabLimitModal').then(({ TabLimitModal }) => {
      const container = document.createElement('div');
      container.id = 'dtt-tab-limit-root';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
      `;
      document.body.appendChild(container);

      const shadowRoot = container.attachShadow({ mode: 'open' });
      const reactContainer = document.createElement('div');
      shadowRoot.appendChild(reactContainer);

      const root = createRoot(reactContainer);
      root.render(
        React.createElement(TabLimitModal, {
          currentTabs: request.currentTabs,
          onCloseOne: (tabId) => {
            chrome.runtime.sendMessage({ action: 'closeTab', tabId });
          },
          onSaveAndClose: (tabId) => {
            chrome.runtime.sendMessage({ action: 'saveAndCloseTab', tabId });
          },
          onCancel: () => {
            chrome.runtime.sendMessage({ action: 'cancelNewTab' });
            root.unmount();
            container.remove();
          }
        })
      );
    });
    
    sendResponse({ success: true });
  }
  return true;
});
