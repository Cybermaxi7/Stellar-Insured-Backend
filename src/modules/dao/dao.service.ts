import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventNames,
  DaoProposalCreatedEvent,
  DaoProposalFinalizedEvent,
} from '../../events';

/**
 * DaoService handles DAO governance operations.
 * Emits domain events at key lifecycle points for decoupled notification handling.
 */
@Injectable()
export class DaoService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Create a new DAO proposal.
   */
  createProposal(
    proposalId: string,
    creatorId: string,
    title: string,
  ): { proposalId: string; status: string } {
    // Business logic would go here

    this.eventEmitter.emit(
      EventNames.DAO_PROPOSAL_CREATED,
      new DaoProposalCreatedEvent(proposalId, creatorId, title),
    );

    return { proposalId, status: 'created' };
  }

  /**
   * Finalize a DAO proposal (after voting ends).
   */
  finalizeProposal(
    proposalId: string,
    creatorId: string,
    passed: boolean,
  ): { proposalId: string; status: string } {
    // Business logic would go here

    this.eventEmitter.emit(
      EventNames.DAO_PROPOSAL_FINALIZED,
      new DaoProposalFinalizedEvent(proposalId, creatorId, passed),
    );

    return { proposalId, status: passed ? 'passed' : 'rejected' };
  }
}
