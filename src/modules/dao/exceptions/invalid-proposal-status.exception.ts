import { BadRequestException } from '@nestjs/common';
import { ProposalStatus } from '../enums/proposal-status.enum';

export class InvalidProposalStatusException extends BadRequestException {
  constructor(proposalId: string, currentStatus: ProposalStatus, requiredStatus: ProposalStatus) {
    super(
      `Proposal '${proposalId}' has status '${currentStatus}', but '${requiredStatus}' is required`,
    );
  }
}
