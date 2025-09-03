// Simple notification sound utility with debouncing
class NotificationSoundManager {
  private audio: HTMLAudioElement | null = null;
  private lastPlayTime: number = 0;
  private debounceMs: number = 1000; // 1 second

  constructor() {
    this.initializeAudio();
  }

  private initializeAudio() {
    try {
      // Create a simple beep sound using Web Audio API
      this.createNotificationSound();
    } catch (error) {
      console.warn('Failed to initialize notification sound:', error);
    }
  }

  private createNotificationSound() {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const createBeep = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    // Store the createBeep function as our play method
    this.playBeep = createBeep;
  }

  private playBeep = () => {
    // Fallback - this will be replaced by createNotificationSound
    console.log('Notification sound would play here');
  };

  play() {
    const now = Date.now();
    
    // Debounce: don't play if we played recently
    if (now - this.lastPlayTime < this.debounceMs) {
      return;
    }

    try {
      this.playBeep();
      this.lastPlayTime = now;
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  // Check if the tab is in the foreground
  isTabActive(): boolean {
    return !document.hidden;
  }

  // Play sound only if tab is active
  playIfActive() {
    if (this.isTabActive()) {
      this.play();
    }
  }
}

// Singleton instance
export const notificationSound = new NotificationSoundManager();

// Desktop notification utility
export const showDesktopNotification = (
  title: string,
  body: string,
  actionUrl?: string,
  icon?: string
): Notification | null => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'app-notification', // Replaces previous notifications
      requireInteraction: false,
      silent: false,
    });

    // Handle click - navigate to action URL if provided
    if (actionUrl) {
      notification.onclick = () => {
        window.focus();
        window.location.href = actionUrl;
        notification.close();
      };
    } else {
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  } catch (error) {
    console.warn('Failed to show desktop notification:', error);
    return null;
  }
};