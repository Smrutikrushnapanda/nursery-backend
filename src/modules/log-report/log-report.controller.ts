import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { LogReportService } from './log-report.service';

@ApiTags('Log Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@Controller('log-report')
export class LogReportController {
  constructor(private readonly logReportService: LogReportService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated request logs with filters' })
  @ApiQuery({ name: 'method', required: false, example: 'POST' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'status', required: false, example: 201 })
  @ApiQuery({ name: 'endpoint', required: false, example: '/plants' })
  @ApiQuery({ name: 'from', required: false, example: '2026-04-01' })
  @ApiQuery({ name: 'to', required: false, example: '2026-04-30' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findAll(
    @Query('method') method?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('endpoint') endpoint?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.logReportService.findAll({
      method,
      userId,
      status: status ? Number(status) : undefined,
      endpoint,
      from,
      to,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated log summary — count + avg duration per method/status' })
  getSummary() {
    return this.logReportService.getSummary();
  }
}