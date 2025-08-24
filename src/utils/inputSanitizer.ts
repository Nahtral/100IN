import DOMPurify from 'dompurify';

export class InputSanitizer {
  /**
   * Sanitize HTML content with enhanced security
   */
  static sanitizeHtml(input: string, allowBasicFormatting: boolean = false): string {
    if (!input) return '';
    
    const config = allowBasicFormatting 
      ? {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
          ALLOWED_ATTR: [],
          FORBID_SCRIPTS: true,
          FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'textarea'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
        }
      : {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          FORBID_SCRIPTS: true
        };
    
    return DOMPurify.sanitize(input, config);
  }

  /**
   * Sanitize text input - remove potential XSS and trim
   */
  static sanitizeText(input: string): string {
    if (!input) return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Validate and sanitize email
   */
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    const sanitized = this.sanitizeText(email.toLowerCase());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }

  /**
   * Validate and sanitize date string
   */
  static sanitizeDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
  }

  /**
   * Validate and sanitize time string (HH:MM format)
   */
  static sanitizeTime(timeString: string): string {
    if (!timeString) return '';
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString) ? timeString : '';
  }

  /**
   * Sanitize array of strings
   */
  static sanitizeStringArray(array: string[]): string[] {
    if (!Array.isArray(array)) return [];
    return array
      .map(item => this.sanitizeText(item))
      .filter(item => item.length > 0);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize phone number
   */
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    // Remove all non-numeric characters except + for international numbers
    return phone.replace(/[^\d+\-\(\)\s]/g, '').trim();
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: string | number): number | null {
    if (typeof input === 'number') return input;
    if (!input) return null;
    
    const cleaned = input.toString().replace(/[^\d.\-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Sanitize and validate medical data input
   */
  static sanitizeMedicalData(input: string): string {
    if (!input) return '';
    // Extra strict sanitization for medical data
    return this.sanitizeText(input)
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 1000); // Limit length for medical notes
  }

  /**
   * Rate limiting check for sensitive operations
   */
  static checkRateLimit(key: string, maxAttempts: number = 10, windowMs: number = 900000): boolean {
    const now = Date.now();
    const windowKey = `rate_limit_${key}`;
    
    try {
      const stored = localStorage.getItem(windowKey);
      const attempts = stored ? JSON.parse(stored) : { count: 0, resetTime: now + windowMs };
      
      if (now > attempts.resetTime) {
        attempts.count = 1;
        attempts.resetTime = now + windowMs;
      } else {
        attempts.count++;
      }
      
      localStorage.setItem(windowKey, JSON.stringify(attempts));
      return attempts.count <= maxAttempts;
    } catch {
      return true; // Allow if localStorage fails
    }
  }

  /**
   * Validate financial data (currency amounts)
   */
  static sanitizeCurrency(amount: string | number): number | null {
    if (typeof amount === 'number') return Math.round(amount * 100) / 100; // Round to 2 decimals
    if (!amount) return null;
    
    const cleaned = amount.toString().replace(/[^\d.\-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.round(num * 100) / 100;
  }
}