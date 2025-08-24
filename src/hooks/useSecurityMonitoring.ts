import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InputSanitizer } from '@/utils/inputSanitizer';
import { ErrorLogger } from '@/utils/errorLogger';

interface SecurityAlert {
  id: string;
  type: 'rate_limit' | 'suspicious_access' | 'data_breach' | 'auth_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Log security-sensitive actions
  const logSecurityEvent = async (
    eventType: string, 
    metadata: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    try {
      // Rate limit security logging to prevent spam
      if (!InputSanitizer.checkRateLimit(`security_log_${user?.id}`, 50, 60000)) {
        return;
      }

      await supabase.from('analytics_events').insert({
        user_id: user?.id,
        event_type: 'security_event',
        event_data: {
          security_event_type: eventType,
          severity,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href,
          ...metadata
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  // Check for suspicious activity patterns
  const checkSuspiciousActivity = async () => {
    if (!user) return;

    try {
      // Check for rapid-fire requests
      const { data: recentEvents } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false });

      if (recentEvents && recentEvents.length > 100) {
        await logSecurityEvent('suspicious_activity', {
          event_count: recentEvents.length,
          pattern: 'rapid_requests'
        }, 'high');
      }
    } catch (error) {
      ErrorLogger.logError(error, { 
        component: 'useSecurityMonitoring',
        action: 'checkSuspiciousActivity'
      });
    }
  };

  // Monitor for unauthorized access attempts
  const monitorDataAccess = (tableName: string, operation: string, recordId?: string) => {
    logSecurityEvent('data_access', {
      table: tableName,
      operation,
      record_id: recordId
    }, 'low');
  };

  // Validate and sanitize sensitive form inputs
  const validateSensitiveInput = (
    input: string, 
    type: 'medical' | 'financial' | 'personal' | 'general' = 'general'
  ): string => {
    switch (type) {
      case 'medical':
        return InputSanitizer.sanitizeMedicalData(input);
      case 'financial':
        const amount = InputSanitizer.sanitizeCurrency(input);
        return amount?.toString() || '';
      case 'personal':
        return InputSanitizer.sanitizeText(input).substring(0, 500);
      default:
        return InputSanitizer.sanitizeText(input);
    }
  };

  // Check for potential SQL injection attempts
  const checkSQLInjection = (input: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\#|\/\*|\*\/)/g,
      /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/gi,
      /'(\s)*(OR|AND)/gi
    ];

    const hasSQLPattern = sqlPatterns.some(pattern => pattern.test(input));
    
    if (hasSQLPattern) {
      logSecurityEvent('sql_injection_attempt', {
        input_sample: input.substring(0, 100),
        detected_patterns: sqlPatterns.filter(p => p.test(input)).length
      }, 'critical');
      
      return true;
    }
    
    return false;
  };

  // Monitor authentication failures
  const logAuthFailure = (reason: string, metadata: Record<string, any> = {}) => {
    logSecurityEvent('auth_failure', {
      reason,
      ...metadata
    }, 'medium');
  };

  // Start security monitoring
  useEffect(() => {
    if (user && !isMonitoring) {
      setIsMonitoring(true);
      
      // Check for suspicious activity every 5 minutes
      const interval = setInterval(checkSuspiciousActivity, 300000);
      
      return () => {
        clearInterval(interval);
        setIsMonitoring(false);
      };
    }
  }, [user, isMonitoring]);

  return {
    alerts,
    logSecurityEvent,
    monitorDataAccess,
    validateSensitiveInput,
    checkSQLInjection,
    logAuthFailure,
    checkSuspiciousActivity
  };
};