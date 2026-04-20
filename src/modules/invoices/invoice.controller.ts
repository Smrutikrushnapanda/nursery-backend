import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InvoiceService } from './invoice.service';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get(':orderId/download')
  download(@Param('orderId', ParseIntPipe) orderId: number, @Res() res: Response) {
    const filePath = this.invoiceService.getInvoicePath(orderId);
    if (!filePath) throw new NotFoundException('Invoice not found for this order');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-order-${orderId}.pdf"`);
    res.sendFile(filePath);
  }
}
