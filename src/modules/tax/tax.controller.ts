import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { UserRole } from '../users/user.entity';
import { TaxService } from './tax.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { UpdateTaxStatusDto } from './dto/update-tax-status.dto';

@ApiTags('Tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tax')
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create tax row for current organization' })
  create(
    @CurrentOrganization() organizationId: string,
    @Body() dto: CreateTaxDto,
  ) {
    return this.taxService.create(organizationId, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get all tax rows for current organization' })
  findAll(@CurrentOrganization() organizationId: string) {
    return this.taxService.findAll(organizationId);
  }

  @Get('active')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  @ApiOperation({ summary: 'Get active tax rows + combined percentage' })
  async findActive(@CurrentOrganization() organizationId: string) {
    const activeTaxes = await this.taxService.findActive(organizationId);
    const totalTaxPercentage = Number(
      activeTaxes.reduce((sum, tax) => sum + Number(tax.percentage || 0), 0).toFixed(2),
    );

    return {
      taxes: activeTaxes,
      totalTaxPercentage,
    };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update tax row' })
  update(
    @CurrentOrganization() organizationId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxDto,
  ) {
    return this.taxService.update(organizationId, id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Activate/inactivate tax row' })
  updateStatus(
    @CurrentOrganization() organizationId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxStatusDto,
  ) {
    return this.taxService.updateStatus(organizationId, id, dto.status);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete tax row' })
  remove(
    @CurrentOrganization() organizationId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.taxService.remove(organizationId, id);
  }
}
