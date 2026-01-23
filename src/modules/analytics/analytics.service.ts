import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from '../dao/entities/proposal.entity';
import { Vote } from '../dao/entities/vote.entity';
import { ProposalStatus } from '../dao/enums/proposal-status.enum';
import { VoteType } from '../dao/enums/vote-type.enum';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  DateRange,
  DaoStatistics,
  PolicyStatistics,
  ClaimsStatistics,
  FraudDetectionStatistics,
  AnalyticsOverview,
} from './interfaces/analytics.interfaces';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
  ) {}

  async getOverview(query: AnalyticsQueryDto): Promise<AnalyticsOverview> {
    const dateRange = this.parseDateRange(query);

    const [dao, policies, claims, fraudDetection] = await Promise.all([
      this.getDaoStatistics(dateRange),
      this.getPolicyStatistics(),
      this.getClaimsStatistics(),
      this.getFraudDetectionStatistics(),
    ]);

    return {
      dao,
      policies,
      claims,
      fraudDetection,
      periodStart: dateRange.startDate,
      periodEnd: dateRange.endDate,
      generatedAt: new Date(),
    };
  }

  private parseDateRange(query: AnalyticsQueryDto): DateRange {
    return {
      startDate: query.startDate ? new Date(query.startDate) : null,
      endDate: query.endDate ? new Date(query.endDate) : null,
    };
  }

  private async getDaoStatistics(dateRange: DateRange): Promise<DaoStatistics> {
    const [proposalStats, voteStats, uniqueVotersResult] = await Promise.all([
      this.getProposalStatistics(dateRange),
      this.getVoteStatistics(dateRange),
      this.getUniqueVotersCount(dateRange),
    ]);

    return {
      ...proposalStats,
      ...voteStats,
      uniqueVoters: uniqueVotersResult,
    };
  }

  private async getProposalStatistics(
    dateRange: DateRange,
  ): Promise<Omit<DaoStatistics, 'totalVotes' | 'forVotes' | 'againstVotes' | 'abstainVotes' | 'uniqueVoters'>> {
    const queryBuilder = this.proposalRepository
      .createQueryBuilder('proposal')
      .select('proposal.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('proposal.status');

    if (dateRange.startDate) {
      queryBuilder.andWhere('proposal.createdAt >= :startDate', {
        startDate: dateRange.startDate,
      });
    }

    if (dateRange.endDate) {
      queryBuilder.andWhere('proposal.createdAt <= :endDate', {
        endDate: dateRange.endDate,
      });
    }

    const results = await queryBuilder.getRawMany<{
      status: ProposalStatus;
      count: string;
    }>();

    const statusCounts = results.reduce(
      (acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<ProposalStatus, number>,
    );

    const totalProposals = Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      totalProposals,
      activeProposals: statusCounts[ProposalStatus.ACTIVE] || 0,
      passedProposals: statusCounts[ProposalStatus.PASSED] || 0,
      rejectedProposals: statusCounts[ProposalStatus.REJECTED] || 0,
      expiredProposals: statusCounts[ProposalStatus.EXPIRED] || 0,
      draftProposals: statusCounts[ProposalStatus.DRAFT] || 0,
    };
  }

  private async getVoteStatistics(
    dateRange: DateRange,
  ): Promise<Pick<DaoStatistics, 'totalVotes' | 'forVotes' | 'againstVotes' | 'abstainVotes'>> {
    const queryBuilder = this.voteRepository
      .createQueryBuilder('vote')
      .select('vote.voteType', 'voteType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('vote.voteType');

    if (dateRange.startDate) {
      queryBuilder.andWhere('vote.createdAt >= :startDate', {
        startDate: dateRange.startDate,
      });
    }

    if (dateRange.endDate) {
      queryBuilder.andWhere('vote.createdAt <= :endDate', {
        endDate: dateRange.endDate,
      });
    }

    const results = await queryBuilder.getRawMany<{
      voteType: VoteType;
      count: string;
    }>();

    const voteCounts = results.reduce(
      (acc, row) => {
        acc[row.voteType] = parseInt(row.count, 10);
        return acc;
      },
      {} as Record<VoteType, number>,
    );

    const forVotes = voteCounts[VoteType.FOR] || 0;
    const againstVotes = voteCounts[VoteType.AGAINST] || 0;
    const abstainVotes = voteCounts[VoteType.ABSTAIN] || 0;

    return {
      totalVotes: forVotes + againstVotes + abstainVotes,
      forVotes,
      againstVotes,
      abstainVotes,
    };
  }

  private async getUniqueVotersCount(dateRange: DateRange): Promise<number> {
    const queryBuilder = this.voteRepository
      .createQueryBuilder('vote')
      .select('COUNT(DISTINCT vote.walletAddress)', 'uniqueVoters');

    if (dateRange.startDate) {
      queryBuilder.andWhere('vote.createdAt >= :startDate', {
        startDate: dateRange.startDate,
      });
    }

    if (dateRange.endDate) {
      queryBuilder.andWhere('vote.createdAt <= :endDate', {
        endDate: dateRange.endDate,
      });
    }

    const result = await queryBuilder.getRawOne<{ uniqueVoters: string | null }>();

    return result?.uniqueVoters ? parseInt(result.uniqueVoters, 10) : 0;
  }

  private async getPolicyStatistics(): Promise<PolicyStatistics> {
    // Placeholder implementation - returns zeros until policies module is implemented
    return {
      _placeholder: true,
      totalPolicies: 0,
      activePolicies: 0,
      expiredPolicies: 0,
      totalPremiums: 0,
    };
  }

  private async getClaimsStatistics(): Promise<ClaimsStatistics> {
    // Placeholder implementation - returns zeros until claims module is implemented
    return {
      _placeholder: true,
      totalClaims: 0,
      pendingClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0,
      totalClaimAmount: 0,
    };
  }

  private async getFraudDetectionStatistics(): Promise<FraudDetectionStatistics> {
    // Placeholder implementation - returns zeros until fraud detection module is implemented
    return {
      _placeholder: true,
      flaggedClaims: 0,
      confirmedFraud: 0,
      falsePositives: 0,
      riskScore: 0,
    };
  }
}
