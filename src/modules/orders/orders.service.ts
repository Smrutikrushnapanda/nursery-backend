import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { PlantVariant } from '../plants/plant-variant.entity';
import { Cart } from '../cart/cart.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { StockLog, StockLogType } from '../inventory/entities/stock-log.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { InvoiceService } from '../invoices/invoice.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(PlantVariant)
    private readonly variantRepo: Repository<PlantVariant>,
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly invoiceService: InvoiceService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateOrderDto, organizationId: string) {
    const variantIds = dto.items.map((i) => i.variantId);

    const variants = await this.variantRepo
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.plant', 'plant')
      .where('v.id IN (:...ids)', { ids: variantIds })
      .andWhere('v.organizationId = :organizationId', { organizationId })
      .andWhere('v.status = true')
      .andWhere('plant.status = true')
      .getMany();

    if (variants.length !== variantIds.length) {
      throw new NotFoundException('One or more variants not found or inactive');
    }

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const result = await this.dataSource.transaction(async (manager) => {
      for (const itemDto of dto.items) {
        const stock = await manager.getRepository(PlantStock).findOne({
          where: { variantId: itemDto.variantId, organizationId },
          lock: { mode: 'pessimistic_write' },
        });

        const available = stock?.quantity ?? 0;
        if (available < itemDto.quantity) {
          const variant = variantMap.get(itemDto.variantId)!;
          throw new BadRequestException(
            `Insufficient stock for "${variant.plant.name} (${variant.size})". Available: ${available}, requested: ${itemDto.quantity}`,
          );
        }
      }

      let subtotalAmount = 0;
      const orderItems = dto.items.map((itemDto) => {
        const variant = variantMap.get(itemDto.variantId)!;
        const unitPrice = Number(variant.price);
        const totalPrice = unitPrice * itemDto.quantity;
        subtotalAmount += totalPrice;

        return manager.getRepository(OrderItem).create({
          variantId: itemDto.variantId,
          quantity: itemDto.quantity,
          unitPrice,
          totalPrice,
        });
      });

      const { discountValue, discountType, discountAmount, finalTotal } =
        this.calculateDiscountTotals(subtotalAmount, dto.discount, dto.discountType);

      const order = manager.getRepository(Order).create({
        organizationId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        totalAmount: finalTotal,
        discount: discountValue,
        discountType,
        status: OrderStatus.CONFIRMED,
        items: orderItems,
      });
      const savedOrder = await manager.getRepository(Order).save(order);

      for (const itemDto of dto.items) {
        await manager.getRepository(PlantStock).decrement(
          { variantId: itemDto.variantId, organizationId },
          'quantity',
          itemDto.quantity,
        );

        await manager.getRepository(StockLog).save(
          manager.getRepository(StockLog).create({
            variantId: itemDto.variantId,
            organizationId,
            type: StockLogType.OUT,
            quantity: itemDto.quantity,
            reference: `ORDER-${savedOrder.id}`,
          }),
        );
      }

      const payment = manager.getRepository(Payment).create({
        orderId: savedOrder.id,
        organizationId,
        method: dto.paymentMethod,
        amount: finalTotal,
        ...(dto.paymentReference ? { referenceNumber: dto.paymentReference } : {}),
        status: PaymentStatus.COMPLETED,
      });
      const savedPayment = await manager.getRepository(Payment).save(payment);

      return {
        order: savedOrder,
        payment: savedPayment,
        summary: {
          subtotalAmount: Number(subtotalAmount.toFixed(2)),
          discountAmount,
          totalAmount: finalTotal,
        },
      };
    });

    // Fire-and-forget invoice (non-blocking — never delays response)
    this.triggerInvoice(result.order, result.payment, organizationId, dto.customerEmail).catch(() => null);

    return result;
  }

  async createFromCart(
    userId: string,
    organizationId: string,
    paymentMethod: PaymentMethod,
    paymentReference?: string,
    customerName?: string,
    customerPhone?: string,
    customerEmail?: string,
    discount?: number,
    discountType?: 'fixed' | 'percentage',
  ) {
    const cartItems = await this.cartRepo.find({
      where: { userId, organizationId },
      relations: ['variant', 'variant.plant'],
    });

    if (!cartItems.length) throw new BadRequestException('Cart is empty');

    const dto: CreateOrderDto = {
      items: cartItems.map((c) => ({ variantId: c.variantId, quantity: c.quantity })),
      paymentMethod,
      paymentReference,
      customerName,
      customerPhone,
      customerEmail,
      discount,
      discountType,
    };

    const result = await this.create(dto, organizationId);
    await this.cartRepo.delete({ userId, organizationId });
    return result;
  }

  async findOne(id: number, organizationId: string) {
    const order = await this.orderRepo.findOne({
      where: { id, organizationId },
      relations: ['items', 'items.variant', 'items.variant.plant', 'payment'],
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findAll(organizationId: string, page: number = 1, limit: number = 50) {
    // Ensure page and limit are valid
    page = Math.max(1, page);
    limit = Math.min(500, Math.max(1, limit));

    const [data, total] = await this.orderRepo.findAndCount({
      where: { organizationId },
      relations: ['items', 'items.variant', 'payment'],
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

  async cancel(id: number, organizationId: string) {
    const order = await this.findOne(id, organizationId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }
    order.status = OrderStatus.CANCELLED;
    return this.orderRepo.save(order);
  }

  private async triggerInvoice(
    order: Order,
    payment: Payment,
    organizationId: string,
    customerEmail?: string,
  ) {
    const org = await this.orgRepo.findOne({ where: { id: organizationId } });
    if (!org) return;
    const invoiceUrl = await this.invoiceService.generateAndSend(order, payment, org, customerEmail);
    payment.invoiceUrl = invoiceUrl;
  }

  private calculateDiscountTotals(
    subtotalAmount: number,
    discount?: number,
    discountType?: 'fixed' | 'percentage',
  ) {
    const normalizedSubtotal = Number(subtotalAmount.toFixed(2));
    const normalizedDiscountValue = Math.max(0, Number(discount ?? 0));
    const normalizedDiscountType: 'fixed' | 'percentage' =
      discountType === 'percentage' ? 'percentage' : 'fixed';

    let discountAmount = 0;
    if (normalizedDiscountValue > 0) {
      if (normalizedDiscountType === 'percentage') {
        const boundedPercentage = Math.min(normalizedDiscountValue, 100);
        discountAmount = (normalizedSubtotal * boundedPercentage) / 100;
      } else {
        discountAmount = Math.min(normalizedDiscountValue, normalizedSubtotal);
      }
    }

    const finalTotal = Math.max(0, normalizedSubtotal - discountAmount);

    return {
      discountValue: Number(normalizedDiscountValue.toFixed(2)),
      discountType: normalizedDiscountType,
      discountAmount: Number(discountAmount.toFixed(2)),
      finalTotal: Number(finalTotal.toFixed(2)),
    };
  }
}
