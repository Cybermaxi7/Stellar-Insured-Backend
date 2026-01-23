import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'Stellar wallet address', nullable: true })
  stellarAddress: string | null;

  @ApiProperty({ description: 'Whether user account is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether user email is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'User information', type: UserResponseDto })
  user: UserResponseDto;
}
