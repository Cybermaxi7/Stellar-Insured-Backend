import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { getEncryptionTransformer, getObjectEncryptionTransformer } from './encryption.transformer';
import { ValueTransformer } from 'typeorm';

@Injectable()
export class EncryptionRegistry implements OnModuleInit {
    private static instance: EncryptionRegistry | null = null;
    private readonly logger = new Logger(EncryptionRegistry.name);

    constructor(private readonly encryptionService: EncryptionService) { }

    onModuleInit() {
        EncryptionRegistry.instance = this;
        this.logger.log('EncryptionRegistry initialized for TypeORM instances');
    }

    static getEncryptionTransformer(): ValueTransformer {
        if (!EncryptionRegistry.instance) {
            throw new Error('EncryptionRegistry not initialized yet');
        }
        return getEncryptionTransformer(EncryptionRegistry.instance.encryptionService);
    }

    static getObjectEncryptionTransformer<T>(): ValueTransformer {
        if (!EncryptionRegistry.instance) {
            throw new Error('EncryptionRegistry not initialized yet');
        }
        return getObjectEncryptionTransformer<T>(EncryptionRegistry.instance.encryptionService);
    }
}
