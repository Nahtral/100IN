import { supabase } from '@/integrations/supabase/client';
import { ErrorLogger } from './errorLogger';

export interface StorageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class StorageValidator {
  private static readonly REQUIRED_BUCKETS = [
    'event-images',
    'player-photos', 
    'evaluation-videos',
    'medical-documents'
  ];

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
  private static readonly ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  static async validateStorageSetup(): Promise<StorageValidationResult> {
    const result: StorageValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if buckets exist and are accessible
      for (const bucketName of this.REQUIRED_BUCKETS) {
        try {
          const { data, error } = await supabase.storage.getBucket(bucketName);
          
          if (error || !data) {
            result.errors.push(`Storage bucket '${bucketName}' is not accessible: ${error?.message || 'Not found'}`);
            result.isValid = false;
          } else {
            // Test bucket permissions
            const testResult = await this.testBucketPermissions(bucketName);
            if (!testResult.canRead) {
              result.warnings.push(`Cannot read from bucket '${bucketName}'`);
            }
            if (!testResult.canWrite) {
              result.warnings.push(`Cannot write to bucket '${bucketName}'`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to validate bucket '${bucketName}': ${error}`);
          result.isValid = false;
        }
      }

      // Log validation results
      await ErrorLogger.logError(
        new Error(`Storage validation completed: ${result.isValid ? 'PASS' : 'FAIL'}`),
        {
          component: 'StorageValidator',
          action: 'validateStorageSetup',
          metadata: {
            errors: result.errors,
            warnings: result.warnings,
            bucketsChecked: this.REQUIRED_BUCKETS.length
          }
        },
        result.isValid ? 'low' : 'high'
      );

    } catch (error) {
      result.errors.push(`Storage validation failed: ${error}`);
      result.isValid = false;
      
      await ErrorLogger.logCritical(error as Error, {
        component: 'StorageValidator',
        action: 'validateStorageSetup'
      });
    }

    return result;
  }

  private static async testBucketPermissions(bucketName: string): Promise<{canRead: boolean, canWrite: boolean}> {
    try {
      // Test read permissions
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list('', { limit: 1 });
      
      const canRead = !listError;

      // Test write permissions with a temporary file
      const testFileName = `test-${Date.now()}.txt`;
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(testFileName, new Blob(['test']), { upsert: true });
      
      const canWrite = !uploadError;

      // Clean up test file if upload was successful
      if (canWrite) {
        await supabase.storage.from(bucketName).remove([testFileName]);
      }

      return { canRead, canWrite };
    } catch {
      return { canRead: false, canWrite: false };
    }
  }

  static validateFile(file: File, type: 'image' | 'video' | 'document'): StorageValidationResult {
    const result: StorageValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      result.errors.push(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
      result.isValid = false;
    }

    // Check file type
    let allowedTypes: string[];
    switch (type) {
      case 'image':
        allowedTypes = this.ALLOWED_IMAGE_TYPES;
        break;
      case 'video':
        allowedTypes = this.ALLOWED_VIDEO_TYPES;
        break;
      case 'document':
        allowedTypes = this.ALLOWED_DOCUMENT_TYPES;
        break;
      default:
        result.errors.push(`Unknown file type category: ${type}`);
        result.isValid = false;
        return result;
    }

    if (!allowedTypes.includes(file.type)) {
      result.errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      result.isValid = false;
    }

    // Check file name
    if (file.name.length > 100) {
      result.warnings.push('File name is very long and may cause display issues');
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      result.warnings.push('File name contains special characters that may cause issues');
    }

    return result;
  }

  static async uploadWithValidation(
    bucketName: string,
    fileName: string,
    file: File,
    fileType: 'image' | 'video' | 'document',
    options?: { upsert?: boolean; metadata?: Record<string, any> }
  ): Promise<{ data: any; error: string | null }> {
    try {
      // Validate file first
      const validation = this.validateFile(file, fileType);
      if (!validation.isValid) {
        return {
          data: null,
          error: validation.errors.join('; ')
        };
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        await ErrorLogger.logWarning(
          `File upload warnings: ${validation.warnings.join('; ')}`,
          {
            component: 'StorageValidator',
            action: 'uploadWithValidation',
            metadata: { fileName, bucketName, fileType }
          }
        );
      }

      // Perform upload
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          upsert: options?.upsert || false,
          metadata: options?.metadata
        });

      if (error) {
        await ErrorLogger.logError(
          new Error(`Storage upload failed: ${error.message}`),
          {
            component: 'StorageValidator',
            action: 'uploadWithValidation',
            metadata: { fileName, bucketName, fileType }
          },
          'medium'
        );

        return { data: null, error: error.message };
      }

      return { data, error: null };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      
      await ErrorLogger.logCritical(error as Error, {
        component: 'StorageValidator',
        action: 'uploadWithValidation',
        metadata: { fileName, bucketName, fileType }
      });

      return { data: null, error: errorMessage };
    }
  }
}