import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByStellarAddress(stellarAddress: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { stellarAddress } });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    stellarAddress?: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      email: data.email,
      passwordHash: data.passwordHash,
      stellarAddress: data.stellarAddress || null,
    });
    return this.userRepository.save(user);
  }

  async updateStellarAddress(
    userId: string,
    stellarAddress: string,
  ): Promise<User | null> {
    await this.userRepository.update(userId, { stellarAddress });
    return this.findById(userId);
  }

  async update(userId: string, data: Partial<User>): Promise<User | null> {
    await this.userRepository.update(userId, data);
    return this.findById(userId);
  }
}
