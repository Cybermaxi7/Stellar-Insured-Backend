import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalStatus } from '../enums/proposal-status.enum';

export class ProposalCreatorDto {
  @ApiProperty({ description: 'Creator user ID' })
  id: string;

  @ApiProperty({ description: 'Creator email' })
  email: string;

  @ApiPropertyOptional({ description: 'Creator Stellar address' })
  stellarAddress: string | null;
}

export class ProposalResponseDto {
  @ApiProperty({ description: 'Proposal ID' })
  id: string;

  @ApiProperty({ description: 'Proposal title' })
  title: string;

  @ApiProperty({ description: 'Proposal description' })
  description: string;

  @ApiProperty({
    description: 'Proposal status',
    enum: ProposalStatus,
  })
  status: ProposalStatus;

  @ApiProperty({ description: 'Voting start date' })
  startDate: Date;

  @ApiProperty({ description: 'Voting end date' })
  endDate: Date;

  @ApiPropertyOptional({ description: 'On-chain ID (for Stellar integration)' })
  onChainId: string | null;

  @ApiPropertyOptional({ description: 'Transaction hash (for Stellar integration)' })
  transactionHash: string | null;

  @ApiPropertyOptional({ description: 'Proposal creator', type: ProposalCreatorDto })
  createdBy: ProposalCreatorDto | null;

  @ApiProperty({ description: 'Proposal creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Total vote count' })
  voteCount?: number;
}
