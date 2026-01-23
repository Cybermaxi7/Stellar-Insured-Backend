import { ApiProperty } from '@nestjs/swagger';
import { VoteType } from '../enums/vote-type.enum';

export class VoteCountDto {
  @ApiProperty({ description: 'Number of FOR votes' })
  for: number;

  @ApiProperty({ description: 'Number of AGAINST votes' })
  against: number;

  @ApiProperty({ description: 'Number of ABSTAIN votes' })
  abstain: number;

  @ApiProperty({ description: 'Total number of votes' })
  total: number;
}

export class VotePercentageDto {
  @ApiProperty({ description: 'Percentage of FOR votes' })
  for: number;

  @ApiProperty({ description: 'Percentage of AGAINST votes' })
  against: number;

  @ApiProperty({ description: 'Percentage of ABSTAIN votes' })
  abstain: number;
}

export class VoteResultDto {
  @ApiProperty({ description: 'Proposal ID' })
  proposalId: string;

  @ApiProperty({ description: 'Vote counts', type: VoteCountDto })
  counts: VoteCountDto;

  @ApiProperty({ description: 'Vote percentages', type: VotePercentageDto })
  percentages: VotePercentageDto;

  @ApiProperty({ description: 'Whether quorum has been reached' })
  quorumReached: boolean;

  @ApiProperty({ description: 'Minimum votes required for quorum' })
  quorumRequired: number;

  @ApiProperty({ description: 'Current leading vote type', enum: VoteType, nullable: true })
  leadingVote: VoteType | null;
}

export class VoteResponseDto {
  @ApiProperty({ description: 'Vote ID' })
  id: string;

  @ApiProperty({ description: 'Proposal ID' })
  proposalId: string;

  @ApiProperty({ description: 'Voter wallet address' })
  walletAddress: string;

  @ApiProperty({ description: 'Vote type', enum: VoteType })
  voteType: VoteType;

  @ApiProperty({ description: 'Vote creation date' })
  createdAt: Date;
}
