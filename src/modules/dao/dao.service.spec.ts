import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { DaoService } from './dao.service';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { User } from '../users/entities/user.entity';
import { ProposalStatus } from './enums/proposal-status.enum';
import { VoteType } from './enums/vote-type.enum';
import {
  ProposalNotFoundException,
  ProposalExpiredException,
  DuplicateVoteException,
  VotingNotStartedException,
  InvalidProposalStatusException,
} from './exceptions';

describe('DaoService', () => {
  let service: DaoService;
  let proposalRepository: Repository<Proposal>;
  let voteRepository: Repository<Vote>;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockUser: User = {
    id: 'user-uuid',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    stellarAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    isActive: true,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    votes: [],
    proposals: [],
  };

  const mockProposal: Proposal = {
    id: 'proposal-uuid',
    title: 'Test Proposal',
    description: 'Test Description',
    status: ProposalStatus.ACTIVE,
    startDate: new Date(Date.now() - 86400000), // yesterday
    endDate: new Date(Date.now() + 86400000), // tomorrow
    onChainId: null,
    transactionHash: null,
    createdById: mockUser.id,
    createdBy: mockUser,
    votes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVote: Vote = {
    id: 'vote-uuid',
    proposalId: mockProposal.id,
    proposal: mockProposal,
    userId: mockUser.id,
    user: mockUser,
    walletAddress: mockUser.stellarAddress!,
    voteType: VoteType.FOR,
    transactionHash: null,
    createdAt: new Date(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaoService,
        {
          provide: getRepositoryToken(Proposal),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              loadRelationCountAndMap: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
              getManyAndCount: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(Vote),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn(),
            })),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<DaoService>(DaoService);
    proposalRepository = module.get<Repository<Proposal>>(
      getRepositoryToken(Proposal),
    );
    voteRepository = module.get<Repository<Vote>>(getRepositoryToken(Vote));
    dataSource = module.get<DataSource>(DataSource);

    jest.clearAllMocks();
  });

  describe('createProposal', () => {
    it('should create a proposal successfully', async () => {
      const dto = {
        title: 'Test Proposal',
        description: 'Test Description',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
      };

      jest.spyOn(proposalRepository, 'create').mockReturnValue(mockProposal);
      jest.spyOn(proposalRepository, 'save').mockResolvedValue(mockProposal);
      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue(mockProposal);

      const result = await service.createProposal(dto, mockUser);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockProposal.id);
      expect(result.title).toBe(mockProposal.title);
      expect(proposalRepository.create).toHaveBeenCalled();
      expect(proposalRepository.save).toHaveBeenCalled();
    });

    it('should create a proposal with ACTIVE status when activateImmediately is true', async () => {
      const dto = {
        title: 'Test Proposal',
        description: 'Test Description',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
        activateImmediately: true,
      };

      jest.spyOn(proposalRepository, 'create').mockReturnValue({
        ...mockProposal,
        status: ProposalStatus.ACTIVE,
      });
      jest.spyOn(proposalRepository, 'save').mockResolvedValue({
        ...mockProposal,
        status: ProposalStatus.ACTIVE,
      });
      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue({
        ...mockProposal,
        status: ProposalStatus.ACTIVE,
      });

      const result = await service.createProposal(dto, mockUser);

      expect(result.status).toBe(ProposalStatus.ACTIVE);
    });
  });

  describe('castVote', () => {
    it('should cast a vote successfully with transaction', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockProposal) // Find proposal
        .mockResolvedValueOnce(null); // No existing vote

      mockQueryRunner.manager.create.mockReturnValue(mockVote);
      mockQueryRunner.manager.save.mockResolvedValue(mockVote);

      const result = await service.castVote(
        mockProposal.id,
        { voteType: VoteType.FOR },
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.voteType).toBe(VoteType.FOR);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw DuplicateVoteException when user already voted', async () => {
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(mockProposal) // Find proposal
        .mockResolvedValueOnce(mockVote); // Existing vote found

      await expect(
        service.castVote(mockProposal.id, { voteType: VoteType.FOR }, mockUser),
      ).rejects.toThrow(DuplicateVoteException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ProposalNotFoundException when proposal does not exist', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.castVote('non-existent-id', { voteType: VoteType.FOR }, mockUser),
      ).rejects.toThrow(ProposalNotFoundException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ProposalExpiredException when voting period has ended', async () => {
      const expiredProposal = {
        ...mockProposal,
        endDate: new Date(Date.now() - 86400000), // yesterday
      };

      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce(expiredProposal)
        .mockResolvedValueOnce(null);

      await expect(
        service.castVote(mockProposal.id, { voteType: VoteType.FOR }, mockUser),
      ).rejects.toThrow(ProposalExpiredException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw VotingNotStartedException when voting has not started', async () => {
      const futureProposal = {
        ...mockProposal,
        status: ProposalStatus.ACTIVE,
        startDate: new Date(Date.now() + 86400000), // tomorrow
        endDate: new Date(Date.now() + 172800000),
      };

      mockQueryRunner.manager.findOne.mockReset();
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(futureProposal);

      await expect(
        service.castVote(mockProposal.id, { voteType: VoteType.FOR }, mockUser),
      ).rejects.toThrow(VotingNotStartedException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw InvalidProposalStatusException when proposal is not ACTIVE', async () => {
      const draftProposal = {
        ...mockProposal,
        status: ProposalStatus.DRAFT,
        startDate: new Date(Date.now() - 86400000), // yesterday
        endDate: new Date(Date.now() + 86400000), // tomorrow
      };

      mockQueryRunner.manager.findOne.mockReset();
      mockQueryRunner.manager.findOne.mockResolvedValueOnce(draftProposal);

      await expect(
        service.castVote(mockProposal.id, { voteType: VoteType.FOR }, mockUser),
      ).rejects.toThrow(InvalidProposalStatusException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getProposalResults', () => {
    it('should return correct vote aggregation', async () => {
      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue(mockProposal);

      const mockResults = [
        { voteType: VoteType.FOR, count: '10' },
        { voteType: VoteType.AGAINST, count: '5' },
        { voteType: VoteType.ABSTAIN, count: '2' },
      ];

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockResults),
      };

      jest
        .spyOn(voteRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getProposalResults(mockProposal.id);

      expect(result.proposalId).toBe(mockProposal.id);
      expect(result.counts.for).toBe(10);
      expect(result.counts.against).toBe(5);
      expect(result.counts.abstain).toBe(2);
      expect(result.counts.total).toBe(17);
      expect(result.quorumReached).toBe(true);
      expect(result.leadingVote).toBe(VoteType.FOR);
    });

    it('should return correct percentages', async () => {
      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue(mockProposal);

      const mockResults = [
        { voteType: VoteType.FOR, count: '50' },
        { voteType: VoteType.AGAINST, count: '30' },
        { voteType: VoteType.ABSTAIN, count: '20' },
      ];

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockResults),
      };

      jest
        .spyOn(voteRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getProposalResults(mockProposal.id);

      expect(result.percentages.for).toBe(50);
      expect(result.percentages.against).toBe(30);
      expect(result.percentages.abstain).toBe(20);
    });

    it('should throw ProposalNotFoundException when proposal does not exist', async () => {
      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getProposalResults('non-existent-id')).rejects.toThrow(
        ProposalNotFoundException,
      );
    });

    it('should indicate quorum not reached when votes are below threshold', async () => {
      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue(mockProposal);

      const mockResults = [{ voteType: VoteType.FOR, count: '5' }];

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockResults),
      };

      jest
        .spyOn(voteRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      const result = await service.getProposalResults(mockProposal.id);

      expect(result.quorumReached).toBe(false);
    });
  });

  describe('activateProposal', () => {
    it('should activate a draft proposal', async () => {
      const draftProposal = {
        ...mockProposal,
        status: ProposalStatus.DRAFT,
      };

      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue(draftProposal);
      jest.spyOn(proposalRepository, 'save').mockResolvedValue({
        ...draftProposal,
        status: ProposalStatus.ACTIVE,
      });

      const result = await service.activateProposal(mockProposal.id, mockUser);

      expect(result.status).toBe(ProposalStatus.ACTIVE);
    });

    it('should throw InvalidProposalStatusException when proposal is not DRAFT', async () => {
      jest.spyOn(proposalRepository, 'findOne').mockResolvedValue(mockProposal);

      await expect(
        service.activateProposal(mockProposal.id, mockUser),
      ).rejects.toThrow(InvalidProposalStatusException);
    });
  });
});
