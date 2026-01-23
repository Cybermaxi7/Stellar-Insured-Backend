import { HttpStatus } from '@nestjs/common';

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 1024 * 1024 * 5, 

  // 👇 FIX: A simple, readable array. No Regex.
  ALLOWED_FILE_TYPES: [
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'application/pdf'
  ], 

  ERROR_HTTP_STATUS: HttpStatus.UNPROCESSABLE_ENTITY, 
} as const;