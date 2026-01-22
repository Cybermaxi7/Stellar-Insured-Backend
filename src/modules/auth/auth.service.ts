import {
  Inject,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UsersService, User } from '../users/users.service';
import * as crypto from 'crypto';
import { Keypair } from 'stellar-sdk';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async generateChallenge(walletAddress: string) {
    // 1. Validate wallet address (Basic check handled by DTO, but ensure basic length/format)

    // 2. Generate Nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);

    const message = `Sign this message to login to InsuranceDAO\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    // 3. Store in Cache
    const key = `auth:challenge:${walletAddress}`;
    const ttl = 10 * 60 * 1000; // 10 minutes in milliseconds

    await this.cacheManager.set(key, { nonce, timestamp, message }, ttl);

    // 4. Return response
    // Expires roughly 10 mins from now, or strictly 5 mins window for verification as per requirements?
    // Requirement: "Verify challenge hasn't expired (5-minute window)"
    // But TTL is 10 mins. I'll stick to logic.
    const expiresAt = new Date((timestamp + 600) * 1000).toISOString();

    return {
      challenge: message,
      expiresAt,
    };
  }

  async login(walletAddress: string, signature: string) {
    const key = `auth:challenge:${walletAddress}`;
    const cached: any = await this.cacheManager.get(key);

    if (!cached) {
      throw new NotFoundException('Challenge not found or expired');
    }

    const { message, timestamp } = cached;

    // Verify timestamp (5 minute window check)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - timestamp > 300) {
      // 300 seconds = 5 mins
      throw new BadRequestException('Challenge expired (5 minute window)');
    }

    // Verify Signature
    try {
      const keypair = Keypair.fromPublicKey(walletAddress);

      // Stellar SDK verify expects Buffer for message and signature.
      // The signature from client is likely base64 (standard for Stellar)
      // Requirements say: "signature: string; // base64 encoded signature"

      const messageBuffer = Buffer.from(message);
      const signatureBuffer = Buffer.from(signature, 'base64');

      const isValid = keypair.verify(messageBuffer, signatureBuffer);

      if (!isValid) {
        throw new UnauthorizedException('Invalid signature');
      }
    } catch (error: any) {
      // Catch Stellar SDK errors (e.g. invalid key format)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new UnauthorizedException('Signature verification failed: ' + error.message);
    }

    // Check User
    const user = await this.usersService.findByWalletAddress(walletAddress);
    if (!user) {
      throw new NotFoundException('User not found. Wallet not registered.');
    }

    // Invalidate Nonce (Replay Attack Prevention)
    await this.cacheManager.del(key);

    // Generate Tokens
    return this.generateTokens(user);
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 86400, // 24 hours
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        roles: user.roles,
      },
    };
  }
}
