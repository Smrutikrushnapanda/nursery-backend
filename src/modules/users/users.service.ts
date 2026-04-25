import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto, organizationId: string): Promise<Omit<User, 'passwordHash'>> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role ?? UserRole.STAFF,
      organizationId,
    });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async findAll(organizationId: string, page: number = 1, limit: number = 50): Promise<any> {
    // Ensure page and limit are valid
    page = Math.max(1, page);
    limit = Math.min(500, Math.max(1, limit));

    const [users, total] = await this.userRepo.findAndCount({
      where: { organizationId },
      skip: (page - 1) * limit,
      take: limit,
    });

    const sanitizedUsers = users.map(({ passwordHash: _, ...u }) => u);

    return {
      data: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdateUserDto, organizationId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepo.findOne({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id, organizationId } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.remove(user);
  }
}
