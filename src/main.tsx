import React from 'react'
import { createRoot } from 'react-dom/client'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './App.tsx'
import './index.css'

// Configure status bar for mobile
const setStatusBarBlack = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#000000' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    // Not running on mobile or status bar not available
    console.log('Status bar configuration not available');
  }
};

setStatusBarBlack();


createRoot(document.getElementById("root")!).render(<App />);
