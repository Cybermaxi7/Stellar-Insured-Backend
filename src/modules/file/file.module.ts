import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
    imports: [
        MulterModule.register({
            storage: diskStorage({
                destination: join(process.cwd(), 'uploads'),
                filename: (req, file, callback) => {
                    // Generate unique filename: uuid + original extension
                    const uniqueSuffix = uuidv4();
                    const ext = extname(file.originalname);
                    callback(null, `${uniqueSuffix}${ext}`);
                },
            }),
        }),
    ],
    controllers: [FileController],
    providers: [FileService],
    exports: [FileService],
})
export class FileModule { }
