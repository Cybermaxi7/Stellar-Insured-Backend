import { Test, TestingModule } from '@nestjs/testing';
import { DaoMemberGuard } from './dao-member.guard';
import { StrellarnetDaoService } from '../services/Strellarnet-dao.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('DaoMemberGuard', () => {
  let guard: DaoMemberGuard;
  let StrellarnetDaoService: StrellarnetDaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DaoMemberGuard,
        {
          provide: StrellarnetDaoService,
          useValue: { isDaoMember: jest.fn() },
        },
      ],
    }).compile();
    guard = module.get(DaoMemberGuard);
    StrellarnetDaoService = module.get(StrellarnetDaoService);
  });

  it('should allow access for valid DAO member', async () => {
    (StrellarnetDaoService.isDaoMember as jest.Mock).mockResolvedValue(true);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { StrellarnetAddress: '0x123' } }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should deny access for non-member', async () => {
    (StrellarnetDaoService.isDaoMember as jest.Mock).mockResolvedValue(false);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { StrellarnetAddress: '0x123' } }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access if no user', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access if no StrellarnetAddress', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { } }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
