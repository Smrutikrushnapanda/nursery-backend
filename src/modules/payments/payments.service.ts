import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './entities/payment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceService } from '../invoices/invoice.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly invoiceService: InvoiceService,
  ) {}

  async create(dto: CreatePaymentDto, organizationId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId, organizationId },
      relations: ['payment'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }
    if (order.payment) {
      throw new ConflictException('Payment already exists for this order');
    }

    // For CASH payments, use the provided amount (for giving change)
    // For other payment methods, use order totalAmount
    let paymentAmount: number;
    if (dto.method === PaymentMethod.CASH) {
      if (!dto.amount || dto.amount <= 0) {
        throw new BadRequestException('Amount is required for CASH payments');
      }
      paymentAmount = dto.amount;
    } else {
      paymentAmount = order.totalAmount;
    }

    const payment = this.paymentRepo.create({
      orderId: dto.orderId,
      organizationId,
      method: dto.method,
      amount: paymentAmount,
      referenceNumber: dto.referenceNumber,
      notes: dto.notes,
      status: PaymentStatus.COMPLETED,
    });

    const saved = await this.paymentRepo.save(payment);

    // Mark order as confirmed
    order.status = OrderStatus.CONFIRMED;
    await this.orderRepo.save(order);

    // Load full order relations for invoice
    const fullOrder = await this.orderRepo.findOne({
      where: { id: saved.orderId },
      relations: ['items', 'items.variant', 'items.variant.plant'],
    });
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (fullOrder && org) {
      const invoiceUrl = await this.invoiceService.generateAndSend(
        fullOrder,
        saved,
        org,
        dto.customerEmail,
      );
      saved.invoiceUrl = invoiceUrl;
      await this.paymentRepo.save(saved);
    }

    return saved;
  }

  async findOne(id: number, organizationId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { id, organizationId },
      relations: ['order', 'order.items', 'order.items.variant', 'order.items.variant.plant'],
    });

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async findByOrder(orderId: number, organizationId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { orderId, organizationId },
      relations: ['order', 'order.items', 'order.items.variant', 'order.items.variant.plant'],
    });

    if (!payment) throw new NotFoundException('Payment not found for this order');
    return payment;
  }

  async findAll(organizationId: string, page: number = 1, limit: number = 50) {
    // Ensure page and limit are valid
    page = Math.max(1, page);
    limit = Math.min(500, Math.max(1, limit));

    const [data, total] = await this.paymentRepo.findAndCount({
      where: { organizationId },
      relations: ['order'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
