import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { UserRole } from './user.entity';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new user in the current organization' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.usersService.create(dto, orgId);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all users for the current organization with pagination' })
  @ApiResponse({ status: 200, description: 'Users fetched successfully' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findAll(
    @CurrentOrganization() orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll(orgId, page ? Number(page) : 1, limit ? Number(limit) : 50);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update user details by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.usersService.update(id, dto, orgId);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string, @CurrentOrganization() orgId: string) {
    return this.usersService.remove(id, orgId);
  }
}
