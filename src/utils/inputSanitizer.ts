import DOMPurify from 'dompurify';

export class InputSanitizer {
  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(input: string): string {
    if (!input) return '';
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
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
}