import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  userRole?: string;
  timestamp: string;
}

export const useAnalytics = () => {
  // Safely try to get auth data, but don't crash if context isn't available
  let user: any = null;
  let primaryRole: string | null = null;
  
  try {
    const authState = useOptimizedAuth();
    user = authState.user;
    primaryRole = authState.primaryRole;
  } catch (error) {
    // Auth context not available yet - this is okay for early app lifecycle
    console.debug('Analytics: Auth context not available yet');
  }

  const track = (eventName: string, properties?: Record<string, any>) => {
    const event: AnalyticsEvent = {
      event: eventName,
      properties: {
        ...properties,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      userId: user?.id,
      userRole: primaryRole || undefined,
      timestamp: new Date().toISOString()
    };

    // Log to console for development (replace with actual analytics service)
    console.log('Analytics Event:', event);

    // Store in localStorage for basic tracking
    try {
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push(event);
      // Keep only last 100 events to prevent storage overflow
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to store analytics event:', error);
    }

    // Here you could integrate with services like:
    // - Google Analytics 4
    // - Mixpanel
    // - Amplitude
    // - PostHog
    // Example: gtag('event', eventName, properties);
  };

  const trackPageView = (pageName: string) => {
    track('page_view', {
      page: pageName,
      referrer: document.referrer
    });
  };

  const trackUserAction = (action: string, target?: string, properties?: Record<string, any>) => {
    track('user_action', {
      action,
      target,
      ...properties
    });
  };

  const trackPerformance = (metric: string, value: number, unit: string = 'ms') => {
    track('performance', {
      metric,
      value,
      unit
    });
  };

  const getStoredEvents = (): AnalyticsEvent[] => {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]');
    } catch {
      return [];
    }
  };

  const clearStoredEvents = () => {
    localStorage.removeItem('analytics_events');
  };

  return {
    track,
    trackPageView,
    trackUserAction,
    trackPerformance,
    getStoredEvents,
    clearStoredEvents
  };
};
