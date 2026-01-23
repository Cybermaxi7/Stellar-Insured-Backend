import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Proposal } from '../entities/proposal.entity';
import { CreateProposalDto } from '../dto/create-proposal.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class ProposalService {
  constructor(
    private proposalRepository: Repository<Proposal>,
    private userRepository: Repository<User>,
  ) {}

  async createProposal(createProposalDto: CreateProposalDto, userId: string): Promise<Proposal> {
    // Validate that the user is a DAO member (authorized)
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is authorized as DAO member
    if (!this.isDAOMember(user)) {
      throw new ForbiddenException('User is not authorized as a DAO member');
    }

    // Validate proposal data
    if (!createProposalDto.title || createProposalDto.title.trim().length === 0) {
      throw new BadRequestException('Proposal title is required');
    }

    if (!createProposalDto.description || createProposalDto.description.trim().length === 0) {
      throw new BadRequestException('Proposal description is required');
    }

    if (!createProposalDto.submitterWalletAddress) {
      throw new BadRequestException('Submitter wallet address is required');
    }

    // Create proposal entity
    const proposal = this.proposalRepository.create({
      title: createProposalDto.title.trim(),
      description: createProposalDto.description.trim(),
      metadata: createProposalDto.metadata || {},
      submitterWalletAddress: createProposalDto.submitterWalletAddress,
      submitter: user,
      status: 'draft',
      votingStartDate: createProposalDto.votingStartDate ? new Date(createProposalDto.votingStartDate) : null,
      votingEndDate: createProposalDto.votingEndDate ? new Date(createProposalDto.votingEndDate) : null,
    });

    // Persist to database
    const savedProposal = await this.proposalRepository.save(proposal);
    return savedProposal;
  }

  async getProposalById(proposalId: string): Promise<Proposal> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
      relations: ['submitter'],
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal with ID ${proposalId} not found`);
    }

    return proposal;
  }

  async getAllProposals(skip: number = 0, take: number = 10): Promise<{ data: Proposal[]; total: number }> {
    const [proposals, total] = await this.proposalRepository.findAndCount({
      relations: ['submitter'],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });

    return { data: proposals, total };
  }

  async updateProposalStatus(proposalId: string, status: string, userId: string): Promise<Proposal> {
    const proposal = await this.getProposalById(proposalId);

    // Check if user is the submitter or has admin privileges
    if (proposal.submitter.id !== userId && !this.isAdmin(await this.userRepository.findOne({ where: { id: userId } }))) {
      throw new ForbiddenException('Only the proposal submitter or admin can update proposal status');
    }

    proposal.status = status as any;
    return this.proposalRepository.save(proposal);
  }

  private isDAOMember(user: User): boolean {
    // Implement your DAO member verification logic here
    // This could check: user roles, wallet balance, token holdings, etc.
    return user && (user as any).roles && (user as any).roles.includes('DAO_MEMBER');
  }

  private isAdmin(user: User): boolean {
    return user && (user as any).roles && (user as any).roles.includes('ADMIN');
  }
}
