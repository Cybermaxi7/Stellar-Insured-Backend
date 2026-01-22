import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventNames,
  ClaimSubmittedEvent,
  ClaimApprovedEvent,
  ClaimRejectedEvent,
  ClaimSettledEvent,
} from '../../events';

/**
 * ClaimsService handles claim lifecycle operations.
 * Emits domain events at key lifecycle points for decoupled notification handling.
 */
@Injectable()
export class ClaimsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Submit a new claim.
   */
  submitClaim(
    claimId: string,
    userId: string,
    policyId: string,
  ): { claimId: string; status: string } {
    // Business logic would go here (e.g., validate policy, save to database)

    // Emit event for notification handling
    this.eventEmitter.emit(
      EventNames.CLAIM_SUBMITTED,
      new ClaimSubmittedEvent(claimId, userId, policyId),
    );

    return { claimId, status: 'submitted' };
  }

  /**
   * Approve a claim.
   */
  approveClaim(
    claimId: string,
    userId: string,
  ): { claimId: string; status: string } {
    // Business logic would go here

    this.eventEmitter.emit(
      EventNames.CLAIM_APPROVED,
      new ClaimApprovedEvent(claimId, userId),
    );

    return { claimId, status: 'approved' };
  }

  /**
   * Reject a claim.
   */
  rejectClaim(
    claimId: string,
    userId: string,
    reason: string,
  ): { claimId: string; status: string } {
    // Business logic would go here

    this.eventEmitter.emit(
      EventNames.CLAIM_REJECTED,
      new ClaimRejectedEvent(claimId, userId, reason),
    );

    return { claimId, status: 'rejected' };
  }

  /**
   * Settle a claim (process payment).
   */
  settleClaim(
    claimId: string,
    userId: string,
    amount: number,
  ): { claimId: string; status: string } {
    // Business logic would go here

    this.eventEmitter.emit(
      EventNames.CLAIM_SETTLED,
      new ClaimSettledEvent(claimId, userId, amount),
    );

    return { claimId, status: 'settled' };
  }
}
