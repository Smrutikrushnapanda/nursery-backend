import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import type { Express } from 'express';
import { User } from '../users/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly orgsService: OrganizationsService,
    private readonly jwtService: JwtService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async register(dto: RegisterDto, logoFile?: Express.Multer.File) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const org = await this.orgsService.create(
      {
        organizationName: dto.organizationName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        isActive: dto.isActive,
      },
      logoFile,
    );

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      organizationId: org.id,
    });
    await this.userRepo.save(user);

    // Auto-create 7-day free trial on registration
    await this.subscriptionsService.createFreeTrial(org.id);

    const { id, isActive, createdAt, updatedAt, ...organizationData } = org;
    return { ...this.signToken(user), organization: organizationData };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const organization = await this.orgsService.findOne(user.organizationId);
    const { id, isActive, createdAt, updatedAt, ...organizationData } =
      organization;
    return { ...this.signToken(user), organization: organizationData };
  }

  private signToken(user: User) {
    const payload = {
      sub: user.id,
      organizationId: user.organizationId,
      organization_id: user.organizationId,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      organizationId: user.organizationId,
    };
  }
}
