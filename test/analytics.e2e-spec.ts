import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Proposal } from '../src/modules/dao/entities/proposal.entity';
import { Vote } from '../src/modules/dao/entities/vote.entity';
import { ProposalStatus } from '../src/modules/dao/enums/proposal-status.enum';
import { VoteType } from '../src/modules/dao/enums/vote-type.enum';
import * as bcrypt from 'bcrypt';

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUser: User;
  let testUser2: User;

  const testUserData = {
    email: 'test-analytics@example.com',
    password: 'testpassword123',
    stellarAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  };

  const testUser2Data = {
    email: 'test-analytics-2@example.com',
    password: 'testpassword123',
    stellarAddress: 'GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    // Clean up test data
    await dataSource.getRepository(Vote).delete({});
    await dataSource.getRepository(Proposal).delete({});
    await dataSource.getRepository(User).delete({});

    // Create test users
    const passwordHash = await bcrypt.hash(testUserData.password, 10);

    testUser = await dataSource.getRepository(User).save({
      email: testUserData.email,
      passwordHash,
      stellarAddress: testUserData.stellarAddress,
      isActive: true,
      isVerified: false,
    });

    testUser2 = await dataSource.getRepository(User).save({
      email: testUser2Data.email,
      passwordHash,
      stellarAddress: testUser2Data.stellarAddress,
      isActive: true,
      isVerified: false,
    });

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUserData.email, password: testUserData.password });
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up
    await dataSource.getRepository(Vote).delete({});
    await dataSource.getRepository(Proposal).delete({});
    await dataSource.getRepository(User).delete({});
    await app.close();
  });

  describe('GET /analytics/overview', () => {
    it('should return analytics overview structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dao');
      expect(response.body).toHaveProperty('policies');
      expect(response.body).toHaveProperty('claims');
      expect(response.body).toHaveProperty('fraudDetection');
      expect(response.body).toHaveProperty('periodStart');
      expect(response.body).toHaveProperty('periodEnd');
      expect(response.body).toHaveProperty('generatedAt');
    });

    it('should return correct DAO statistics with real data', async () => {
      // Create test proposals with different statuses
      await dataSource.getRepository(Proposal).save([
        {
          title: 'Active Proposal 1',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() + 86400000),
          createdById: testUser.id,
        },
        {
          title: 'Active Proposal 2',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() + 86400000),
          createdById: testUser.id,
        },
        {
          title: 'Passed Proposal',
          description: 'Test',
          status: ProposalStatus.PASSED,
          startDate: new Date(Date.now() - 172800000),
          endDate: new Date(Date.now() - 86400000),
          createdById: testUser.id,
        },
        {
          title: 'Rejected Proposal',
          description: 'Test',
          status: ProposalStatus.REJECTED,
          startDate: new Date(Date.now() - 172800000),
          endDate: new Date(Date.now() - 86400000),
          createdById: testUser.id,
        },
        {
          title: 'Draft Proposal',
          description: 'Test',
          status: ProposalStatus.DRAFT,
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 172800000),
          createdById: testUser.id,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dao.totalProposals).toBe(5);
      expect(response.body.dao.activeProposals).toBe(2);
      expect(response.body.dao.passedProposals).toBe(1);
      expect(response.body.dao.rejectedProposals).toBe(1);
      expect(response.body.dao.draftProposals).toBe(1);
    });

    it('should return correct vote statistics with real data', async () => {
      // Create a proposal
      const proposal = await dataSource.getRepository(Proposal).save({
        title: 'Test Proposal',
        description: 'Test',
        status: ProposalStatus.ACTIVE,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
        createdById: testUser.id,
      });

      // Create votes
      await dataSource.getRepository(Vote).save([
        {
          proposalId: proposal.id,
          userId: testUser.id,
          walletAddress: testUser.stellarAddress!,
          voteType: VoteType.FOR,
        },
        {
          proposalId: proposal.id,
          userId: testUser2.id,
          walletAddress: testUser2.stellarAddress!,
          voteType: VoteType.AGAINST,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dao.totalVotes).toBe(2);
      expect(response.body.dao.forVotes).toBe(1);
      expect(response.body.dao.againstVotes).toBe(1);
      expect(response.body.dao.abstainVotes).toBe(0);
      expect(response.body.dao.uniqueVoters).toBe(2);
    });

    it('should filter by startDate', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      // Create proposals at different times
      await dataSource.getRepository(Proposal).save([
        {
          title: 'Old Proposal',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: yesterday,
          endDate: tomorrow,
          createdById: testUser.id,
          createdAt: new Date('2023-01-01'),
        },
        {
          title: 'New Proposal',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: yesterday,
          endDate: tomorrow,
          createdById: testUser.id,
          createdAt: new Date('2024-06-01'),
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .query({ startDate: '2024-01-01' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dao.totalProposals).toBe(1);
      expect(response.body.periodStart).not.toBeNull();
    });

    it('should filter by endDate', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      // Create proposals at different times
      await dataSource.getRepository(Proposal).save([
        {
          title: 'Old Proposal',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: yesterday,
          endDate: tomorrow,
          createdById: testUser.id,
          createdAt: new Date('2023-06-01'),
        },
        {
          title: 'New Proposal',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: yesterday,
          endDate: tomorrow,
          createdById: testUser.id,
          createdAt: new Date('2024-06-01'),
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .query({ endDate: '2023-12-31' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dao.totalProposals).toBe(1);
      expect(response.body.periodEnd).not.toBeNull();
    });

    it('should filter by both dates', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      // Create proposals at different times
      await dataSource.getRepository(Proposal).save([
        {
          title: 'Early Proposal',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: yesterday,
          endDate: tomorrow,
          createdById: testUser.id,
          createdAt: new Date('2023-01-01'),
        },
        {
          title: 'Mid Proposal',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: yesterday,
          endDate: tomorrow,
          createdById: testUser.id,
          createdAt: new Date('2024-06-15'),
        },
        {
          title: 'Late Proposal',
          description: 'Test',
          status: ProposalStatus.ACTIVE,
          startDate: yesterday,
          endDate: tomorrow,
          createdById: testUser.id,
          createdAt: new Date('2025-01-01'),
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dao.totalProposals).toBe(1);
      expect(response.body.periodStart).not.toBeNull();
      expect(response.body.periodEnd).not.toBeNull();
    });

    it('should return placeholder for policies', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.policies._placeholder).toBe(true);
      expect(response.body.policies.totalPolicies).toBe(0);
      expect(response.body.policies.activePolicies).toBe(0);
      expect(response.body.policies.expiredPolicies).toBe(0);
      expect(response.body.policies.totalPremiums).toBe(0);
    });

    it('should return placeholder for claims', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.claims._placeholder).toBe(true);
      expect(response.body.claims.totalClaims).toBe(0);
      expect(response.body.claims.pendingClaims).toBe(0);
      expect(response.body.claims.approvedClaims).toBe(0);
      expect(response.body.claims.rejectedClaims).toBe(0);
      expect(response.body.claims.totalClaimAmount).toBe(0);
    });

    it('should return placeholder for fraud detection', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.fraudDetection._placeholder).toBe(true);
      expect(response.body.fraudDetection.flaggedClaims).toBe(0);
      expect(response.body.fraudDetection.confirmedFraud).toBe(0);
      expect(response.body.fraudDetection.falsePositives).toBe(0);
      expect(response.body.fraudDetection.riskScore).toBe(0);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/analytics/overview')
        .expect(401);
    });

    it('should return 400 for invalid startDate format', async () => {
      await request(app.getHttpServer())
        .get('/analytics/overview')
        .query({ startDate: 'invalid-date' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid endDate format', async () => {
      await request(app.getHttpServer())
        .get('/analytics/overview')
        .query({ endDate: 'not-a-date' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
