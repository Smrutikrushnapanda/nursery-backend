import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@ApiTags('Master - Plants')
@ApiBearerAuth()
@Controller('master/plant')
export class PlantsController {
  constructor(private readonly service: PlantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Plant' })
  create(@Body() dto: CreatePlantDto, @CurrentOrganization() orgId: string) {
    return this.service.create(dto, orgId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get All Plants' })
  findAll(@CurrentOrganization() orgId: string | undefined) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get Plant By ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentOrganization() orgId: string | undefined) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update Plant' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.service.update(id, dto, orgId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete Plant (Soft)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentOrganization() orgId: string) {
    return this.service.remove(id, orgId);
  }
}