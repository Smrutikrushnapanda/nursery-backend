import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Organization } from '../organizations/entities/organization.entity';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly invoiceDir: string;

  constructor(private readonly config: ConfigService) {
    this.invoiceDir = path.resolve(process.cwd(), 'invoices');
    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, { recursive: true });
    }
  }

  async generateAndSend(
    order: Order,
    payment: Payment,
    org: Organization,
    customerEmail?: string,
  ): Promise<string> {
    const filePath = await this.generatePdf(order, payment, org);
    const fileName = path.basename(filePath);
    const baseUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:5000';
    const invoiceUrl = `${baseUrl}/api/invoices/${order.id}/download`;

    if (customerEmail) {
      await this.sendEmail(customerEmail, order, filePath, org).catch((err) =>
        this.logger.error(`Failed to send invoice email: ${(err as Error).message}`),
      );
    }

    return invoiceUrl;
  }

  private generatePdf(order: Order, payment: Payment, org: Organization): Promise<string> {
    return new Promise((resolve, reject) => {
      const fileName = `invoice-order-${order.id}-${Date.now()}.pdf`;
      const filePath = path.join(this.invoiceDir, fileName);
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      // ── Header ──────────────────────────────────────────────
      doc.fontSize(22).font('Helvetica-Bold').text(org.organizationName, { align: 'left' });
      doc.fontSize(10).font('Helvetica').fillColor('#555555')
        .text(org.address)
        .text(org.phone)
        .text(org.email);

      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
      doc.moveDown(0.5);

      // ── Invoice meta ─────────────────────────────────────────
      doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
      doc.fontSize(10).font('Helvetica')
        .text(`Invoice #: INV-${String(order.id).padStart(6, '0')}`, { align: 'right' })
        .text(`Order #: ${order.id}`, { align: 'right' })
        .text(`Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' })
        .text(`Payment: ${payment.method}`, { align: 'right' });

      doc.moveDown(1);

      // ── Bill To ──────────────────────────────────────────────
      if (order.customerName) {
        doc.fontSize(11).font('Helvetica-Bold').text('Bill To:');
        doc.fontSize(10).font('Helvetica')
          .text(order.customerName)
          .text(order.customerPhone ?? '');
        doc.moveDown(1);
      }

      // ── Items table header ───────────────────────────────────
      const tableTop = doc.y;
      const col = { item: 50, size: 260, qty: 340, price: 400, total: 470 };

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
      doc.rect(50, tableTop, 495, 20).fill('#2d6a4f');
      doc.fillColor('#ffffff')
        .text('Item', col.item, tableTop + 5)
        .text('Size', col.size, tableTop + 5)
        .text('Qty', col.qty, tableTop + 5)
        .text('Unit Price', col.price, tableTop + 5)
        .text('Total', col.total, tableTop + 5);

      // ── Items rows ───────────────────────────────────────────
      let rowY = tableTop + 22;
      doc.font('Helvetica').fontSize(10).fillColor('#000000');

      for (const [i, item] of order.items.entries()) {
        const bg = i % 2 === 0 ? '#f4f9f6' : '#ffffff';
        doc.rect(50, rowY, 495, 18).fill(bg);
        doc.fillColor('#000000')
          .text(item.variant?.plant?.name ?? `Variant #${item.variantId}`, col.item, rowY + 4, { width: 200 })
          .text(item.variant?.size ?? '-', col.size, rowY + 4)
          .text(String(item.quantity), col.qty, rowY + 4)
          .text(`₹${Number(item.unitPrice).toFixed(2)}`, col.price, rowY + 4)
          .text(`₹${Number(item.totalPrice).toFixed(2)}`, col.total, rowY + 4);
        rowY += 20;
      }

      // ── Totals ───────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.moveTo(50, rowY + 5).lineTo(545, rowY + 5).strokeColor('#cccccc').stroke();
      rowY += 15;

      const subtotalAmount = order.items.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0,
      );
      const discountAmount =
        order.discountType === 'percentage'
          ? (subtotalAmount * Math.min(Number(order.discount ?? 0), 100)) / 100
          : Math.min(Number(order.discount ?? 0), subtotalAmount);

      doc.fontSize(11).font('Helvetica')
        .text('Subtotal:', col.price, rowY, { width: 70, align: 'right' })
        .text(`₹${subtotalAmount.toFixed(2)}`, col.total, rowY);
      rowY += 18;

      if (discountAmount > 0) {
        const discountLabel =
          order.discountType === 'percentage'
            ? `Discount (${Number(order.discount ?? 0).toFixed(2)}%)`
            : 'Discount';
        doc.text(`${discountLabel}:`, col.price, rowY, { width: 70, align: 'right' })
          .text(`-₹${discountAmount.toFixed(2)}`, col.total, rowY);
        rowY += 18;
      }

      doc.fontSize(12).font('Helvetica-Bold')
        .text('Total Amount:', col.price, rowY, { width: 70, align: 'right' })
        .text(`₹${Number(order.totalAmount).toFixed(2)}`, col.total, rowY);

      // ── Footer ───────────────────────────────────────────────
      doc.fontSize(9).font('Helvetica').fillColor('#888888')
        .text('Thank you for your purchase!', 50, 750, { align: 'center', width: 495 });

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private async sendEmail(
    to: string,
    order: Order,
    pdfPath: string,
    org: Organization,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });

    await transporter.sendMail({
      from: `"${org.organizationName}" <${this.config.get<string>('SMTP_USER')}>`,
      to,
      subject: `Your Invoice – Order #${order.id} | ${org.organizationName}`,
      html: `
        <p>Dear Customer,</p>
        <p>Thank you for your purchase from <strong>${org.organizationName}</strong>.</p>
        <p>Please find your invoice for <strong>Order #${order.id}</strong> attached.</p>
        <p><strong>Total: ₹${Number(order.totalAmount).toFixed(2)}</strong></p>
        <br/>
        <p>Regards,<br/>${org.organizationName}</p>
      `,
      attachments: [
        {
          filename: `invoice-order-${order.id}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  getInvoicePath(orderId: number): string | null {
    const files = fs.readdirSync(this.invoiceDir);
    const match = files.find((f) => f.startsWith(`invoice-order-${orderId}-`));
    return match ? path.join(this.invoiceDir, match) : null;
  }
}
