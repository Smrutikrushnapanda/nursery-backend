import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(
    @Body() dto: CreateUserDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.usersService.create(dto, orgId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findAll(@CurrentOrganization() orgId: string) {
    return this.usersService.findAll(orgId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.usersService.update(id, dto, orgId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @CurrentOrganization() orgId: string) {
    return this.usersService.remove(id, orgId);
  }
}
