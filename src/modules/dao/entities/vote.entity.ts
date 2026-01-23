import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Proposal } from './proposal.entity';
import { VoteType } from '../enums/vote-type.enum';

@Entity('votes')
@Unique(['proposalId', 'walletAddress'])
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  proposalId: string;

  @ManyToOne(() => Proposal, (proposal) => proposal.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'proposalId' })
  proposal: Proposal;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 56 })
  @Index()
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: VoteType,
  })
  voteType: VoteType;

  @Column({ nullable: true })
  transactionHash: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
