export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface DaoStatistics {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  expiredProposals: number;
  draftProposals: number;
  totalVotes: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  uniqueVoters: number;
}

export interface PolicyStatistics {
  _placeholder: boolean;
  totalPolicies: number;
  activePolicies: number;
  expiredPolicies: number;
  totalPremiums: number;
}

export interface ClaimsStatistics {
  _placeholder: boolean;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalClaimAmount: number;
}

export interface FraudDetectionStatistics {
  _placeholder: boolean;
  flaggedClaims: number;
  confirmedFraud: number;
  falsePositives: number;
  riskScore: number;
}

export interface AnalyticsOverview {
  dao: DaoStatistics;
  policies: PolicyStatistics;
  claims: ClaimsStatistics;
  fraudDetection: FraudDetectionStatistics;
  periodStart: Date | null;
  periodEnd: Date | null;
  generatedAt: Date;
}
