import { BadRequestException } from '@nestjs/common';

export class ProposalExpiredException extends BadRequestException {
  constructor(proposalId: string) {
    super(`Proposal with ID '${proposalId}' has expired`);
  }
}
