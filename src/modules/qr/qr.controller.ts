import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PlanFeature } from '../plans/entities/plan.entity';
import { QrService } from './qr.service';

@ApiTags('QR')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate QR code for a plant' })
  @ApiParam({ name: 'plantId', type: Number })
  @UseGuards(AuthGuard('jwt'), FeatureGuard)
  @RequireFeature(PlanFeature.QR)
  @Post('generate/:plantId')
  generate(@Param('plantId') plantId: string, @Request() req: any) {
    return this.qrService.generate(+plantId, req.user.organizationId);
  }

  @ApiOperation({ summary: 'Scan QR code — returns plant data (PUBLIC, no auth)' })
  @ApiParam({ name: 'code', type: String, description: 'QR code string' })
  @Get(':code')
  scan(@Param('code') code: string) {
    return this.qrService.scan(code);
  }
}
