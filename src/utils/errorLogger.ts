import { supabase } from '@/integrations/supabase/client';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  userRole?: string;
  metadata?: Record<string, any>;
}

export class ErrorLogger {
  static async logError(
    error: Error | any,
    context: ErrorContext,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    try {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[ErrorLogger]', { error, context, severity });
      }

      // Prepare error data
      const errorData = {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace available',
        url: window.location.href,
        user_agent: navigator.userAgent,
        user_id: context.userId || null,
        user_role: context.userRole || null,
        severity,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        }
      };

      // Log to Supabase error_logs table
      await supabase.from('error_logs').insert(errorData);
    } catch (logError) {
      // Fallback: at least log to console if Supabase fails
      console.error('[ErrorLogger] Failed to log error:', logError);
      console.error('[ErrorLogger] Original error:', error);
    }
  }

  static async logWarning(message: string, context: ErrorContext) {
    await this.logError(new Error(message), context, 'low');
  }

  static async logCritical(error: Error | any, context: ErrorContext) {
    await this.logError(error, context, 'critical');
  }
}