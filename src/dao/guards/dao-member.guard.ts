import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class DAOMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Check if user has DAO_MEMBER role
    const hasDAORole = user.roles && user.roles.includes('DAO_MEMBER');

    if (!hasDAORole) {
      throw new ForbiddenException('User is not authorized as a DAO member');
    }

    return true;
  }
}
