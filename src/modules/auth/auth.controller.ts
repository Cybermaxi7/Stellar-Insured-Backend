import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginChallengeDto } from './dtos/login-challenge.dto';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto, LoginPasswordDto } from './dtos';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login/password')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT issued' })
  @HttpCode(HttpStatus.OK)
  async loginWithPassword(@Body() dto: LoginPasswordDto) {
    return this.authService.loginWithPassword(dto);
  }

  @Public()
  @Post('login/challenge')
  @ApiOperation({ summary: 'Request a login challenge' })
  @ApiResponse({ status: 200, description: 'Challenge generated' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Too many challenge requests.',
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
  async getLoginChallenge(@Body() dto: LoginChallengeDto) {
    return this.authService.generateChallenge(dto.walletAddress);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Submit login signature' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT issued' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Too many login attempts.',
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 10, ttl: 3600000 } }) // 10 requests per hour
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.walletAddress, dto.signature);
  }
}
