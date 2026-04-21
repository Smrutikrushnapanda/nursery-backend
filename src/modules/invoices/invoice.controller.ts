import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InvoiceService } from './invoice.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(':orderId/download')
  @ApiOperation({ summary: 'Download invoice PDF for an order' })
  @ApiParam({ name: 'orderId', type: Number, description: 'Order ID' })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'Invoice PDF file',
    schema: { type: 'string', format: 'binary' },
  })
  @ApiResponse({ status: 404, description: 'Invoice not found for this order' })
  download(@Param('orderId', ParseIntPipe) orderId: number, @Res() res: Response) {
    const filePath = this.invoiceService.getInvoicePath(orderId);
    if (!filePath) throw new NotFoundException('Invoice not found for this order');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-order-${orderId}.pdf"`);
    res.sendFile(filePath);
  }
}
