import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('dao_proposals')
export class Proposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column()
  submitterWalletAddress: string;

  @Column({ default: 'draft' })
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed';

  @Column({ nullable: true })
  votingStartDate: Date;

  @Column({ nullable: true })
  votingEndDate: Date;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'submitter_id' })
  submitter: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
