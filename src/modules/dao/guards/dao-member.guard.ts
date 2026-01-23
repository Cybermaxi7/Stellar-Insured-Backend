import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class DaoMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.stellarAddress) {
      throw new ForbiddenException(
        'Stellar wallet address is required to participate in DAO voting. Please link your wallet.',
      );
    }

    // Future extension point: Check on-chain membership status
    // const isMember = await this.stellarService.checkMembership(user.stellarAddress);
    // if (!isMember) {
    //   throw new ForbiddenException('You are not a member of this DAO');
    // }

    return true;
  }
}
