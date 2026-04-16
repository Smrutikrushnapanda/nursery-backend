import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  async create(
    createOrganizationDto: CreateOrganizationDto,
  ): Promise<Organization> {
    const { organizationName, email, phone, address, logoUrl, isActive } =
      createOrganizationDto;

    // Check if email already exists
    const existingEmail = await this.orgRepo.findOne({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('Organization email already taken');
    }

    const org = this.orgRepo.create({
      organizationName,
      email,
      phone,
      address,
      logoUrl: logoUrl ?? null,
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    });

    return this.orgRepo.save(org);
  }

  async findAll(): Promise<Organization[]> {
    return this.orgRepo.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization not found for id: ${id}`);
    }

    return org;
  }

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const org = await this.findOne(id);

    // Check if email is being changed and if it's already taken
    if (
      updateOrganizationDto.email &&
      updateOrganizationDto.email !== org.email
    ) {
      const existingEmail = await this.orgRepo.findOne({
        where: { email: updateOrganizationDto.email },
      });

      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Organization email already taken');
      }
    }

    const updated = this.orgRepo.merge(org, updateOrganizationDto);
    return this.orgRepo.save(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const org = await this.findOne(id);

    try {
      await this.orgRepo.remove(org);
      return { message: 'Organization deleted successfully' };
    } catch (error: unknown) {
      // Check if it's a foreign key constraint violation
      const err = error as { code?: string };
      if (err.code === '23503') {
        throw new ConflictException(
          'Cannot delete organization. It may have related records that need to be removed first.',
        );
      }
      throw error;
    }
  }
}
