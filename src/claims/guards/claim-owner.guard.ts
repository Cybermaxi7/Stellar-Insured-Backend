import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { ClaimService } from '../services/claim.service';

// Extend Express Request to include the authenticated user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Injectable()
export class ClaimOwnerGuard implements CanActivate {
  constructor(private claimService: ClaimService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    const claimIdParam = request.params.claimId;
    const claimId = Array.isArray(claimIdParam)
      ? claimIdParam[0]
      : claimIdParam;

    if (!userId || !claimId) {
      throw new ForbiddenException('Invalid request context');
    }

    const claim = await this.claimService.getClaimById(claimId);

    if (!claim || claim.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this claim',
      );
    }

    return true;
  }
}
