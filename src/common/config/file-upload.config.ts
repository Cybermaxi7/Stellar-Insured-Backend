import { HttpStatus } from '@nestjs/common';

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 1024 * 1024 * 5, 
  
  ALLOWED_FILE_TYPES: /image\/(jpeg|png|webp)|application\/pdf/,
  
  ERROR_HTTP_STATUS: 422,
} as const;