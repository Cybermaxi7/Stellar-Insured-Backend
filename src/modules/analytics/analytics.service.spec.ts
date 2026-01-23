import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Proposal } from '../dao/entities/proposal.entity';
import { Vote } from '../dao/entities/vote.entity';
import { ProposalStatus } from '../dao/enums/proposal-status.enum';
import { VoteType } from '../dao/enums/vote-type.enum';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockProposalQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockVoteQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  const mockProposalRepository = {
    createQueryBuilder: jest.fn(() => mockProposalQueryBuilder),
  };

  const mockVoteRepository = {
    createQueryBuilder: jest.fn(() => mockVoteQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Proposal),
          useValue: mockProposalRepository,
        },
        {
          provide: getRepositoryToken(Vote),
          useValue: mockVoteRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    beforeEach(() => {
      mockProposalQueryBuilder.getRawMany.mockResolvedValue([
        { status: ProposalStatus.ACTIVE, count: '5' },
        { status: ProposalStatus.PASSED, count: '10' },
        { status: ProposalStatus.REJECTED, count: '3' },
        { status: ProposalStatus.EXPIRED, count: '2' },
        { status: ProposalStatus.DRAFT, count: '4' },
      ]);

      mockVoteQueryBuilder.getRawMany.mockResolvedValue([
        { voteType: VoteType.FOR, count: '50' },
        { voteType: VoteType.AGAINST, count: '30' },
        { voteType: VoteType.ABSTAIN, count: '10' },
      ]);

      mockVoteQueryBuilder.getRawOne.mockResolvedValue({ uniqueVoters: '25' });
    });

    it('should return correct DAO statistics from mocked data', async () => {
      const result = await service.getOverview({});

      expect(result.dao.totalProposals).toBe(24);
      expect(result.dao.activeProposals).toBe(5);
      expect(result.dao.passedProposals).toBe(10);
      expect(result.dao.rejectedProposals).toBe(3);
      expect(result.dao.expiredProposals).toBe(2);
      expect(result.dao.draftProposals).toBe(4);
      expect(result.dao.totalVotes).toBe(90);
      expect(result.dao.forVotes).toBe(50);
      expect(result.dao.againstVotes).toBe(30);
      expect(result.dao.abstainVotes).toBe(10);
      expect(result.dao.uniqueVoters).toBe(25);
    });

    it('should return placeholder data for policies', async () => {
      const result = await service.getOverview({});

      expect(result.policies._placeholder).toBe(true);
      expect(result.policies.totalPolicies).toBe(0);
      expect(result.policies.activePolicies).toBe(0);
      expect(result.policies.expiredPolicies).toBe(0);
      expect(result.policies.totalPremiums).toBe(0);
    });

    it('should return placeholder data for claims', async () => {
      const result = await service.getOverview({});

      expect(result.claims._placeholder).toBe(true);
      expect(result.claims.totalClaims).toBe(0);
      expect(result.claims.pendingClaims).toBe(0);
      expect(result.claims.approvedClaims).toBe(0);
      expect(result.claims.rejectedClaims).toBe(0);
      expect(result.claims.totalClaimAmount).toBe(0);
    });

    it('should return placeholder data for fraud detection', async () => {
      const result = await service.getOverview({});

      expect(result.fraudDetection._placeholder).toBe(true);
      expect(result.fraudDetection.flaggedClaims).toBe(0);
      expect(result.fraudDetection.confirmedFraud).toBe(0);
      expect(result.fraudDetection.falsePositives).toBe(0);
      expect(result.fraudDetection.riskScore).toBe(0);
    });

    it('should apply startDate filter when provided', async () => {
      const startDate = '2024-01-01';
      await service.getOverview({ startDate });

      expect(mockProposalQueryBuilder.andWhere).toHaveBeenCalledWith(
        'proposal.createdAt >= :startDate',
        { startDate: new Date(startDate) },
      );
      expect(mockVoteQueryBuilder.andWhere).toHaveBeenCalledWith(
        'vote.createdAt >= :startDate',
        { startDate: new Date(startDate) },
      );
    });

    it('should apply endDate filter when provided', async () => {
      const endDate = '2024-12-31';
      await service.getOverview({ endDate });

      expect(mockProposalQueryBuilder.andWhere).toHaveBeenCalledWith(
        'proposal.createdAt <= :endDate',
        { endDate: new Date(endDate) },
      );
      expect(mockVoteQueryBuilder.andWhere).toHaveBeenCalledWith(
        'vote.createdAt <= :endDate',
        { endDate: new Date(endDate) },
      );
    });

    it('should apply both date filters when both provided', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      await service.getOverview({ startDate, endDate });

      expect(mockProposalQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockVoteQueryBuilder.andWhere).toHaveBeenCalledTimes(4); // 2 for vote stats + 2 for unique voters
    });

    it('should handle empty results gracefully', async () => {
      mockProposalQueryBuilder.getRawMany.mockResolvedValue([]);
      mockVoteQueryBuilder.getRawMany.mockResolvedValue([]);
      mockVoteQueryBuilder.getRawOne.mockResolvedValue({ uniqueVoters: null });

      const result = await service.getOverview({});

      expect(result.dao.totalProposals).toBe(0);
      expect(result.dao.activeProposals).toBe(0);
      expect(result.dao.passedProposals).toBe(0);
      expect(result.dao.rejectedProposals).toBe(0);
      expect(result.dao.expiredProposals).toBe(0);
      expect(result.dao.draftProposals).toBe(0);
      expect(result.dao.totalVotes).toBe(0);
      expect(result.dao.forVotes).toBe(0);
      expect(result.dao.againstVotes).toBe(0);
      expect(result.dao.abstainVotes).toBe(0);
      expect(result.dao.uniqueVoters).toBe(0);
    });

    it('should include generatedAt timestamp', async () => {
      const beforeTest = new Date();
      const result = await service.getOverview({});
      const afterTest = new Date();

      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeTest.getTime(),
      );
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(
        afterTest.getTime(),
      );
    });

    it('should handle null uniqueVoters result', async () => {
      mockVoteQueryBuilder.getRawOne.mockResolvedValue(null);

      const result = await service.getOverview({});

      expect(result.dao.uniqueVoters).toBe(0);
    });

    it('should return periodStart and periodEnd as null when no dates provided', async () => {
      const result = await service.getOverview({});

      expect(result.periodStart).toBeNull();
      expect(result.periodEnd).toBeNull();
    });

    it('should return periodStart and periodEnd when dates provided', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const result = await service.getOverview({ startDate, endDate });

      expect(result.periodStart).toEqual(new Date(startDate));
      expect(result.periodEnd).toEqual(new Date(endDate));
    });
  });
});
