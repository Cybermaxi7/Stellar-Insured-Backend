import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UPLOAD_CONFIG } from '../../common/config/file-upload.config'; 

@Controller('files')
export class FilesController {
  
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: UPLOAD_CONFIG.ALLOWED_FILE_TYPES,
        })
        .addMaxSizeValidator({
          maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
        })
        .build({
          errorHttpStatusCode: UPLOAD_CONFIG.ERROR_HTTP_STATUS as any,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
  ) {
    return {
      message: 'File uploaded successfully',
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}