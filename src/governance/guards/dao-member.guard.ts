/* eslint-disable prettier/prettier */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, User } from '../../user/entities/user.entity';
import { StrellarnetDaoService } from '../services/Strellarnet-dao.service';

interface AuthenticatedRequest extends Request {
  user: User;
}

@Injectable()
export class DaoMemberGuard implements CanActivate {
  constructor(private readonly StrellarnetDaoService: StrellarnetDaoService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!user.StrellarnetAddress) {
      throw new ForbiddenException('StrellarNet address required for DAO membership check');
    }
    const isDaoMember = await this.StrellarnetDaoService.isDaoMember(user.StrellarnetAddress);
    if (!isDaoMember) {
      throw new ForbiddenException('DAO membership required');
    }
    return true;
  }
}
