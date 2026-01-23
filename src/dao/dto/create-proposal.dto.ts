import { IsString, IsNotEmpty, IsOptional, IsObject, IsDateString } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  submitterWalletAddress: string;

  @IsDateString()
  @IsOptional()
  votingStartDate?: string;

  @IsDateString()
  @IsOptional()
  votingEndDate?: string;
}
