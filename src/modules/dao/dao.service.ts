import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Proposal } from './entities/proposal.entity';
import { Vote } from './entities/vote.entity';
import { User } from '../users/entities/user.entity';
import { ProposalStatus } from './enums/proposal-status.enum';
import { VoteType } from './enums/vote-type.enum';
import {
  CreateProposalDto,
  CastVoteDto,
  ProposalResponseDto,
  ProposalListQueryDto,
  PaginatedProposalResponseDto,
  VoteResultDto,
  VoteResponseDto,
} from './dto';
import {
  ProposalNotFoundException,
  ProposalExpiredException,
  DuplicateVoteException,
  VotingNotStartedException,
  InvalidProposalStatusException,
} from './exceptions';

@Injectable()
export class DaoService {
  private readonly QUORUM_THRESHOLD = 10; // Minimum votes required for quorum

  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepository: Repository<Proposal>,
    @InjectRepository(Vote)
    private readonly voteRepository: Repository<Vote>,
    private readonly dataSource: DataSource,
  ) {}

  async createProposal(
    dto: CreateProposalDto,
    user: User,
  ): Promise<ProposalResponseDto> {
    const proposal = this.proposalRepository.create({
      title: dto.title,
      description: dto.description,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      status: dto.activateImmediately
        ? ProposalStatus.ACTIVE
        : ProposalStatus.DRAFT,
      createdById: user.id,
    });

    const saved = await this.proposalRepository.save(proposal);

    const createdProposal = await this.proposalRepository.findOne({
      where: { id: saved.id },
      relations: ['createdBy'],
    });

    return this.toProposalResponse(createdProposal!);
  }

  async getProposals(
    query: ProposalListQueryDto,
  ): Promise<PaginatedProposalResponseDto<ProposalResponseDto>> {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const qb = this.proposalRepository
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.createdBy', 'createdBy')
      .loadRelationCountAndMap('proposal.voteCount', 'proposal.votes');

    if (status) {
      qb.where('proposal.status = :status', { status });
    }

    const [proposals, total] = await qb
      .orderBy('proposal.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: proposals.map((p) => this.toProposalResponse(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProposalById(id: string): Promise<ProposalResponseDto> {
    const proposal = await this.proposalRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!proposal) {
      throw new ProposalNotFoundException(id);
    }

    const voteCount = await this.voteRepository.count({
      where: { proposalId: id },
    });

    return {
      ...this.toProposalResponse(proposal),
      voteCount,
    };
  }

  async castVote(
    proposalId: string,
    dto: CastVoteDto,
    user: User,
  ): Promise<VoteResponseDto> {
    // DaoMemberGuard ensures stellarAddress exists, but TypeScript doesn't know that
    if (!user.stellarAddress) {
      throw new ForbiddenException('Stellar wallet address is required');
    }
    const walletAddress = user.stellarAddress;

    // Use a transaction with pessimistic locking
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the proposal row for the duration of this transaction
      const proposal = await queryRunner.manager.findOne(Proposal, {
        where: { id: proposalId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!proposal) {
        throw new ProposalNotFoundException(proposalId);
      }

      // Validate proposal status
      if (proposal.status !== ProposalStatus.ACTIVE) {
        throw new InvalidProposalStatusException(
          proposalId,
          proposal.status,
          ProposalStatus.ACTIVE,
        );
      }

      const now = new Date();

      // Validate voting has started
      if (now < proposal.startDate) {
        throw new VotingNotStartedException(proposalId);
      }

      // Validate voting hasn't expired
      if (now > proposal.endDate) {
        throw new ProposalExpiredException(proposalId);
      }

      // Check for existing vote (one-wallet-one-vote)
      const existingVote = await queryRunner.manager.findOne(Vote, {
        where: { proposalId, walletAddress },
      });

      if (existingVote) {
        throw new DuplicateVoteException(walletAddress, proposalId);
      }

      // Create and save the vote
      const vote = queryRunner.manager.create(Vote, {
        proposalId,
        userId: user.id,
        walletAddress,
        voteType: dto.voteType,
      });

      const savedVote = await queryRunner.manager.save(vote);

      await queryRunner.commitTransaction();

      return this.toVoteResponse(savedVote);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getProposalResults(proposalId: string): Promise<VoteResultDto> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new ProposalNotFoundException(proposalId);
    }

    // Get vote counts using raw query for efficiency
    const results = await this.voteRepository
      .createQueryBuilder('vote')
      .select('vote.voteType', 'voteType')
      .addSelect('COUNT(*)', 'count')
      .where('vote.proposalId = :proposalId', { proposalId })
      .groupBy('vote.voteType')
      .getRawMany();

    const counts = {
      for: 0,
      against: 0,
      abstain: 0,
      total: 0,
    };

    for (const result of results) {
      const count = parseInt(result.count, 10);
      counts.total += count;

      switch (result.voteType) {
        case VoteType.FOR:
          counts.for = count;
          break;
        case VoteType.AGAINST:
          counts.against = count;
          break;
        case VoteType.ABSTAIN:
          counts.abstain = count;
          break;
      }
    }

    const percentages = {
      for: counts.total > 0 ? (counts.for / counts.total) * 100 : 0,
      against: counts.total > 0 ? (counts.against / counts.total) * 100 : 0,
      abstain: counts.total > 0 ? (counts.abstain / counts.total) * 100 : 0,
    };

    // Determine leading vote
    let leadingVote: VoteType | null = null;
    if (counts.total > 0) {
      if (counts.for > counts.against && counts.for > counts.abstain) {
        leadingVote = VoteType.FOR;
      } else if (counts.against > counts.for && counts.against > counts.abstain) {
        leadingVote = VoteType.AGAINST;
      } else if (counts.abstain > counts.for && counts.abstain > counts.against) {
        leadingVote = VoteType.ABSTAIN;
      }
      // If tied, leadingVote remains null
    }

    return {
      proposalId,
      counts,
      percentages,
      quorumReached: counts.total >= this.QUORUM_THRESHOLD,
      quorumRequired: this.QUORUM_THRESHOLD,
      leadingVote,
    };
  }

  async activateProposal(
    proposalId: string,
    user: User,
  ): Promise<ProposalResponseDto> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['createdBy'],
    });

    if (!proposal) {
      throw new ProposalNotFoundException(proposalId);
    }

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new InvalidProposalStatusException(
        proposalId,
        proposal.status,
        ProposalStatus.DRAFT,
      );
    }

    proposal.status = ProposalStatus.ACTIVE;
    const saved = await this.proposalRepository.save(proposal);

    return this.toProposalResponse(saved);
  }

  async finalizeProposal(proposalId: string): Promise<ProposalResponseDto> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['createdBy'],
    });

    if (!proposal) {
      throw new ProposalNotFoundException(proposalId);
    }

    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new InvalidProposalStatusException(
        proposalId,
        proposal.status,
        ProposalStatus.ACTIVE,
      );
    }

    const now = new Date();
    if (now < proposal.endDate) {
      throw new InvalidProposalStatusException(
        proposalId,
        proposal.status,
        ProposalStatus.ACTIVE,
      );
    }

    const results = await this.getProposalResults(proposalId);

    if (!results.quorumReached) {
      proposal.status = ProposalStatus.EXPIRED;
    } else if (results.counts.for > results.counts.against) {
      proposal.status = ProposalStatus.PASSED;
    } else {
      proposal.status = ProposalStatus.REJECTED;
    }

    const saved = await this.proposalRepository.save(proposal);
    return this.toProposalResponse(saved);
  }

  private toProposalResponse(proposal: Proposal): ProposalResponseDto {
    return {
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      status: proposal.status,
      startDate: proposal.startDate,
      endDate: proposal.endDate,
      onChainId: proposal.onChainId,
      transactionHash: proposal.transactionHash,
      createdBy: proposal.createdBy
        ? {
            id: proposal.createdBy.id,
            email: proposal.createdBy.email,
            stellarAddress: proposal.createdBy.stellarAddress,
          }
        : null,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
      voteCount: (proposal as any).voteCount,
    };
  }

  private toVoteResponse(vote: Vote): VoteResponseDto {
    return {
      id: vote.id,
      proposalId: vote.proposalId,
      walletAddress: vote.walletAddress,
      voteType: vote.voteType,
      createdAt: vote.createdAt,
    };
  }
}
