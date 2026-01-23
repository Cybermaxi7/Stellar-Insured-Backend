import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({
    description: 'Proposal title',
    example: 'Increase staking rewards',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Detailed proposal description',
    example:
      'This proposal aims to increase staking rewards from 5% to 7% APY to incentivize more participation.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Voting start date (ISO 8601 format)',
    example: '2024-02-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Voting end date (ISO 8601 format)',
    example: '2024-02-15T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Activate proposal immediately (skip DRAFT status)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  activateImmediately?: boolean;
}
