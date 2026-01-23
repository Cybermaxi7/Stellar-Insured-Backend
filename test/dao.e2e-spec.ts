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

describe('DaoController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let authTokenWithoutWallet: string;
  let testUser: User;
  let testUserWithoutWallet: User;
  let testProposal: Proposal;

  const testUserData = {
    email: 'test-dao@example.com',
    password: 'testpassword123',
    stellarAddress: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  };

  const testUserWithoutWalletData = {
    email: 'no-wallet@example.com',
    password: 'testpassword123',
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

    testUserWithoutWallet = await dataSource.getRepository(User).save({
      email: testUserWithoutWalletData.email,
      passwordHash,
      stellarAddress: null,
      isActive: true,
      isVerified: false,
    });

    // Get auth tokens
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUserData.email, password: testUserData.password });
    authToken = loginResponse.body.accessToken;

    const loginResponseNoWallet = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUserWithoutWalletData.email,
        password: testUserWithoutWalletData.password,
      });
    authTokenWithoutWallet = loginResponseNoWallet.body.accessToken;

    // Create a test proposal
    testProposal = await dataSource.getRepository(Proposal).save({
      title: 'Test Proposal',
      description: 'Test Description',
      status: ProposalStatus.ACTIVE,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      createdById: testUser.id,
    });
  });

  afterAll(async () => {
    // Clean up
    await dataSource.getRepository(Vote).delete({});
    await dataSource.getRepository(Proposal).delete({});
    await dataSource.getRepository(User).delete({});
    await app.close();
  });

  describe('POST /dao/proposals', () => {
    it('should create a proposal', async () => {
      const proposalData = {
        title: 'New Proposal',
        description: 'New Description',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/dao/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .send(proposalData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(proposalData.title);
      expect(response.body.status).toBe(ProposalStatus.DRAFT);
    });

    it('should return 401 without authentication', async () => {
      const proposalData = {
        title: 'New Proposal',
        description: 'New Description',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
      };

      await request(app.getHttpServer())
        .post('/dao/proposals')
        .send(proposalData)
        .expect(401);
    });

    it('should return 403 without Stellar wallet', async () => {
      const proposalData = {
        title: 'New Proposal',
        description: 'New Description',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 172800000).toISOString(),
      };

      await request(app.getHttpServer())
        .post('/dao/proposals')
        .set('Authorization', `Bearer ${authTokenWithoutWallet}`)
        .send(proposalData)
        .expect(403);
    });
  });

  describe('GET /dao/proposals', () => {
    it('should return paginated list of proposals', async () => {
      const response = await request(app.getHttpServer())
        .get('/dao/proposals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('limit');
    });

    it('should filter proposals by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/dao/proposals')
        .query({ status: ProposalStatus.ACTIVE })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(
        response.body.data.every((p: any) => p.status === ProposalStatus.ACTIVE),
      ).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/dao/proposals').expect(401);
    });
  });

  describe('GET /dao/proposals/:id', () => {
    it('should return a single proposal', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dao/proposals/${testProposal.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testProposal.id);
      expect(response.body.title).toBe(testProposal.title);
    });

    it('should return 404 for non-existent proposal', async () => {
      await request(app.getHttpServer())
        .get('/dao/proposals/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /dao/proposals/:id/vote', () => {
    it('should cast a vote successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/dao/proposals/${testProposal.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voteType: VoteType.FOR })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.voteType).toBe(VoteType.FOR);
      expect(response.body.proposalId).toBe(testProposal.id);
    });

    it('should return 409 for duplicate vote', async () => {
      // First vote
      await request(app.getHttpServer())
        .post(`/dao/proposals/${testProposal.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voteType: VoteType.FOR })
        .expect(201);

      // Duplicate vote attempt
      await request(app.getHttpServer())
        .post(`/dao/proposals/${testProposal.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voteType: VoteType.AGAINST })
        .expect(409);
    });

    it('should return 404 for non-existent proposal', async () => {
      await request(app.getHttpServer())
        .post('/dao/proposals/00000000-0000-0000-0000-000000000000/vote')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voteType: VoteType.FOR })
        .expect(404);
    });

    it('should return 403 without Stellar wallet', async () => {
      await request(app.getHttpServer())
        .post(`/dao/proposals/${testProposal.id}/vote`)
        .set('Authorization', `Bearer ${authTokenWithoutWallet}`)
        .send({ voteType: VoteType.FOR })
        .expect(403);
    });

    it('should return 400 for expired proposal', async () => {
      // Create an expired proposal
      const expiredProposal = await dataSource.getRepository(Proposal).save({
        title: 'Expired Proposal',
        description: 'Test',
        status: ProposalStatus.ACTIVE,
        startDate: new Date(Date.now() - 172800000),
        endDate: new Date(Date.now() - 86400000), // ended yesterday
        createdById: testUser.id,
      });

      await request(app.getHttpServer())
        .post(`/dao/proposals/${expiredProposal.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voteType: VoteType.FOR })
        .expect(400);
    });

    it('should return 400 for proposal not yet started', async () => {
      // Create a future proposal
      const futureProposal = await dataSource.getRepository(Proposal).save({
        title: 'Future Proposal',
        description: 'Test',
        status: ProposalStatus.ACTIVE,
        startDate: new Date(Date.now() + 86400000), // starts tomorrow
        endDate: new Date(Date.now() + 172800000),
        createdById: testUser.id,
      });

      await request(app.getHttpServer())
        .post(`/dao/proposals/${futureProposal.id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ voteType: VoteType.FOR })
        .expect(400);
    });
  });

  describe('GET /dao/proposals/:id/results', () => {
    it('should return vote aggregation results', async () => {
      // Cast some votes first
      await dataSource.getRepository(Vote).save({
        proposalId: testProposal.id,
        userId: testUser.id,
        walletAddress: testUser.stellarAddress!,
        voteType: VoteType.FOR,
      });

      const response = await request(app.getHttpServer())
        .get(`/dao/proposals/${testProposal.id}/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('proposalId');
      expect(response.body).toHaveProperty('counts');
      expect(response.body).toHaveProperty('percentages');
      expect(response.body).toHaveProperty('quorumReached');
      expect(response.body.counts.for).toBe(1);
      expect(response.body.counts.total).toBe(1);
    });

    it('should return 404 for non-existent proposal', async () => {
      await request(app.getHttpServer())
        .get('/dao/proposals/00000000-0000-0000-0000-000000000000/results')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /dao/proposals/:id/activate', () => {
    it('should activate a draft proposal', async () => {
      // Create a draft proposal
      const draftProposal = await dataSource.getRepository(Proposal).save({
        title: 'Draft Proposal',
        description: 'Test',
        status: ProposalStatus.DRAFT,
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        createdById: testUser.id,
      });

      const response = await request(app.getHttpServer())
        .post(`/dao/proposals/${draftProposal.id}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.status).toBe(ProposalStatus.ACTIVE);
    });

    it('should return 400 for non-draft proposal', async () => {
      await request(app.getHttpServer())
        .post(`/dao/proposals/${testProposal.id}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
