import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { DaoService } from './dao.service';
import {
  CreateProposalDto,
  CastVoteDto,
  ProposalResponseDto,
  ProposalListQueryDto,
  PaginatedProposalResponseDto,
  VoteResultDto,
  VoteResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DaoMemberGuard } from './guards/dao-member.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('DAO')
@ApiBearerAuth()
@Controller('dao')
@UseGuards(JwtAuthGuard)
export class DaoController {
  constructor(private readonly daoService: DaoService) {}

  @Post('proposals')
  @UseGuards(DaoMemberGuard)
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({
    status: 201,
    description: 'Proposal created successfully',
    type: ProposalResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Stellar wallet not linked' })
  async createProposal(
    @Body() dto: CreateProposalDto,
    @CurrentUser() user: User,
  ): Promise<ProposalResponseDto> {
    return this.daoService.createProposal(dto, user);
  }

  @Get('proposals')
  @ApiOperation({ summary: 'Get paginated list of proposals' })
  @ApiResponse({
    status: 200,
    description: 'List of proposals with pagination',
  })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getProposals(
    @Query() query: ProposalListQueryDto,
  ): Promise<PaginatedProposalResponseDto<ProposalResponseDto>> {
    return this.daoService.getProposals(query);
  }

  @Get('proposals/:id')
  @ApiOperation({ summary: 'Get a single proposal by ID' })
  @ApiParam({ name: 'id', description: 'Proposal UUID' })
  @ApiResponse({
    status: 200,
    description: 'Proposal details',
    type: ProposalResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Proposal not found' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getProposalById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProposalResponseDto> {
    return this.daoService.getProposalById(id);
  }

  @Post('proposals/:id/vote')
  @UseGuards(DaoMemberGuard)
  @ApiOperation({ summary: 'Cast a vote on a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal UUID' })
  @ApiResponse({
    status: 201,
    description: 'Vote cast successfully',
    type: VoteResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Voting not started or proposal expired',
  })
  @ApiNotFoundResponse({ description: 'Proposal not found' })
  @ApiConflictResponse({ description: 'Already voted on this proposal' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Stellar wallet not linked' })
  async castVote(
    @Param('id', ParseUUIDPipe) proposalId: string,
    @Body() dto: CastVoteDto,
    @CurrentUser() user: User,
  ): Promise<VoteResponseDto> {
    return this.daoService.castVote(proposalId, dto, user);
  }

  @Get('proposals/:id/results')
  @ApiOperation({ summary: 'Get voting results for a proposal' })
  @ApiParam({ name: 'id', description: 'Proposal UUID' })
  @ApiResponse({
    status: 200,
    description: 'Voting results with counts and percentages',
    type: VoteResultDto,
  })
  @ApiNotFoundResponse({ description: 'Proposal not found' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async getProposalResults(
    @Param('id', ParseUUIDPipe) proposalId: string,
  ): Promise<VoteResultDto> {
    return this.daoService.getProposalResults(proposalId);
  }

  @Post('proposals/:id/activate')
  @UseGuards(DaoMemberGuard)
  @ApiOperation({ summary: 'Activate a draft proposal' })
  @ApiParam({ name: 'id', description: 'Proposal UUID' })
  @ApiResponse({
    status: 200,
    description: 'Proposal activated successfully',
    type: ProposalResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Proposal is not in DRAFT status' })
  @ApiNotFoundResponse({ description: 'Proposal not found' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Stellar wallet not linked' })
  async activateProposal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ProposalResponseDto> {
    return this.daoService.activateProposal(id, user);
  }
}
