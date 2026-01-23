import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DaoStatisticsDto {
  @ApiProperty({ description: 'Total number of proposals', example: 25 })
  totalProposals: number;

  @ApiProperty({ description: 'Number of active proposals', example: 5 })
  activeProposals: number;

  @ApiProperty({ description: 'Number of passed proposals', example: 12 })
  passedProposals: number;

  @ApiProperty({ description: 'Number of rejected proposals', example: 3 })
  rejectedProposals: number;

  @ApiProperty({ description: 'Number of expired proposals', example: 2 })
  expiredProposals: number;

  @ApiProperty({ description: 'Number of draft proposals', example: 3 })
  draftProposals: number;

  @ApiProperty({ description: 'Total number of votes cast', example: 150 })
  totalVotes: number;

  @ApiProperty({ description: 'Number of FOR votes', example: 80 })
  forVotes: number;

  @ApiProperty({ description: 'Number of AGAINST votes', example: 50 })
  againstVotes: number;

  @ApiProperty({ description: 'Number of ABSTAIN votes', example: 20 })
  abstainVotes: number;

  @ApiProperty({ description: 'Number of unique voters', example: 45 })
  uniqueVoters: number;
}

export class PolicyStatisticsDto {
  @ApiProperty({
    description: 'Indicates this is placeholder data',
    example: true,
  })
  _placeholder: boolean;

  @ApiProperty({ description: 'Total number of policies', example: 0 })
  totalPolicies: number;

  @ApiProperty({ description: 'Number of active policies', example: 0 })
  activePolicies: number;

  @ApiProperty({ description: 'Number of expired policies', example: 0 })
  expiredPolicies: number;

  @ApiProperty({ description: 'Total premiums collected', example: 0 })
  totalPremiums: number;
}

export class ClaimsStatisticsDto {
  @ApiProperty({
    description: 'Indicates this is placeholder data',
    example: true,
  })
  _placeholder: boolean;

  @ApiProperty({ description: 'Total number of claims', example: 0 })
  totalClaims: number;

  @ApiProperty({ description: 'Number of pending claims', example: 0 })
  pendingClaims: number;

  @ApiProperty({ description: 'Number of approved claims', example: 0 })
  approvedClaims: number;

  @ApiProperty({ description: 'Number of rejected claims', example: 0 })
  rejectedClaims: number;

  @ApiProperty({ description: 'Total claim amount', example: 0 })
  totalClaimAmount: number;
}

export class FraudDetectionStatisticsDto {
  @ApiProperty({
    description: 'Indicates this is placeholder data',
    example: true,
  })
  _placeholder: boolean;

  @ApiProperty({ description: 'Number of flagged claims', example: 0 })
  flaggedClaims: number;

  @ApiProperty({ description: 'Number of confirmed fraud cases', example: 0 })
  confirmedFraud: number;

  @ApiProperty({ description: 'Number of false positives', example: 0 })
  falsePositives: number;

  @ApiProperty({ description: 'Overall risk score', example: 0 })
  riskScore: number;
}

export class AnalyticsOverviewDto {
  @ApiProperty({
    description: 'DAO/Voting statistics',
    type: DaoStatisticsDto,
  })
  dao: DaoStatisticsDto;

  @ApiProperty({
    description: 'Policy statistics (placeholder)',
    type: PolicyStatisticsDto,
  })
  policies: PolicyStatisticsDto;

  @ApiProperty({
    description: 'Claims statistics (placeholder)',
    type: ClaimsStatisticsDto,
  })
  claims: ClaimsStatisticsDto;

  @ApiProperty({
    description: 'Fraud detection statistics (placeholder)',
    type: FraudDetectionStatisticsDto,
  })
  fraudDetection: FraudDetectionStatisticsDto;

  @ApiPropertyOptional({
    description: 'Start of the analytics period',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  periodStart: Date | null;

  @ApiPropertyOptional({
    description: 'End of the analytics period',
    example: '2024-12-31T23:59:59.999Z',
    nullable: true,
  })
  periodEnd: Date | null;

  @ApiProperty({
    description: 'Timestamp when the analytics were generated',
    example: '2024-06-15T10:30:00.000Z',
  })
  generatedAt: Date;
}
