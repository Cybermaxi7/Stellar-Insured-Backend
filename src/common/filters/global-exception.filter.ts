import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { getErrorCode } from '../constants/error-codes';
import { DomainError } from '../errors/domain.error';


@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = getErrorCode(status);
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errorCode = getErrorCode(status);
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        if (
          'message' in responseObj &&
          typeof responseObj.message === 'string'
        ) {
          message = responseObj.message;
        }
        // Extract validation errors if available
        if ('error' in responseObj && typeof responseObj.error === 'string') {
          const errorField = responseObj.error;
          if (
            errorField.toLowerCase().includes('validation') ||
            errorField.toLowerCase().includes('bad request')
          ) {
            errorCode = 'VALIDATION_ERROR';
          }
        }
        // Capture validation details
        if ('message' in responseObj && Array.isArray(responseObj.message)) {
          details = { validationErrors: responseObj.message };
        }
      }
    } else {
      this.logger.error(
        `Unexpected error: ${String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      message,
      statusCode: status,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details && { details }),
    };

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
