import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ProposalService } from '../services/proposal.service';
import { CreateProposalDto } from '../dto/create-proposal.dto';
import { DAOMemberGuard } from '../guards/dao-member.guard';
import { Proposal } from '../entities/proposal.entity';

@Controller('dao/proposals')
export class ProposalController {
  constructor(private proposalService: ProposalService) {}

  /**
   * POST /dao/proposals
   * Create a new DAO proposal
   * Only authorized DAO members can submit proposals
   */
  @Post()
  @UseGuards(DAOMemberGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProposal(
    createProposalDto: CreateProposalDto,
    req: any,
  ): Promise<{ success: boolean; data: Proposal; message: string }> {
    const proposal = await this.proposalService.createProposal(createProposalDto, req.user.id);

    return {
      success: true,
      data: proposal,
      message: 'Proposal created successfully',
    };
  }

  /**
   * GET /dao/proposals/:id
   * Retrieve a specific proposal by ID
   */
  @Get(':id')
  async getProposal(proposalId: string): Promise<{ success: boolean; data: Proposal }> {
    const proposal = await this.proposalService.getProposalById(proposalId);

    return {
      success: true,
      data: proposal,
    };
  }

  /**
   * GET /dao/proposals
   * Retrieve all proposals with pagination
   */
  @Get()
  async getAllProposals(
    skip: string = '0',
    take: string = '10',
  ): Promise<{ success: boolean; data: Proposal[]; total: number }> {
    const { data, total } = await this.proposalService.getAllProposals(parseInt(skip), parseInt(take));

    return {
      success: true,
      data,
      total,
    };
  }

  /**
   * PATCH /dao/proposals/:id/status
   * Update proposal status
   * Only the submitter or admin can update status
   */
  @Patch(':id/status')
  @UseGuards(DAOMemberGuard)
  async updateProposalStatus(
    proposalId: string,
    body: { status: string },
    req: any,
  ): Promise<{ success: boolean; data: Proposal; message: string }> {
    const proposal = await this.proposalService.updateProposalStatus(proposalId, body.status, req.user.id);

    return {
      success: true,
      data: proposal,
      message: 'Proposal status updated successfully',
    };
  }
}
