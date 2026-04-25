import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Plant } from '../plants/plant.entity';
import { PlantVariant } from '../plants/plant-variant.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { StockLog, StockLogType } from '../inventory/entities/stock-log.entity';
import {
  Payment,
  PaymentStatus,
} from '../payments/entities/payment.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { InvoiceService } from '../invoices/invoice.service';
import {
  CreateManualBillDto,
  ManualBillItemDto,
} from './dto/create-manual-bill.dto';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
    @InjectRepository(PlantVariant)
    private readonly variantRepo: Repository<PlantVariant>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly invoiceService: InvoiceService,
    private readonly dataSource: DataSource,
  ) {}

  async getPlants(organizationId: string) {
    const plants = await this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect(
        'plant.variants',
        'variant',
        'variant.status = :variantStatus AND variant.organizationId = :organizationId',
        { variantStatus: true, organizationId },
      )
      .leftJoinAndSelect(
        'variant.stock',
        'stock',
        'stock.organizationId = :organizationId',
        { organizationId },
      )
      .where('plant.organizationId = :organizationId', { organizationId })
      .andWhere('plant.status = :plantStatus', { plantStatus: true })
      .orderBy('plant.name', 'ASC')
      .addOrderBy('variant.createdAt', 'ASC')
      .getMany();

    return plants.map((plant) => ({
      id: plant.id,
      name: plant.name,
      sku: plant.sku,
      variants: (plant.variants ?? []).map((variant) => ({
        id: variant.id,
        size: variant.size,
        sku: variant.sku,
        defaultPrice: Number(variant.price),
        stockQuantity: variant.stock?.quantity ?? 0,
      })),
    }));
  }

  async getPlantVariants(plantId: number, organizationId: string) {
    const plant = await this.plantRepo.findOne({
      where: { id: plantId, organizationId, status: true },
      select: { id: true, name: true, sku: true },
    });

    if (!plant) {
      throw new NotFoundException(`Plant #${plantId} not found`);
    }

    const variants = await this.variantRepo
      .createQueryBuilder('variant')
      .leftJoinAndSelect(
        'variant.stock',
        'stock',
        'stock.organizationId = :organizationId',
        { organizationId },
      )
      .where('variant.plantId = :plantId', { plantId })
      .andWhere('variant.organizationId = :organizationId', { organizationId })
      .andWhere('variant.status = :status', { status: true })
      .orderBy('variant.createdAt', 'ASC')
      .getMany();

    return {
      plant,
      variants: variants.map((variant) => ({
        id: variant.id,
        size: variant.size,
        sku: variant.sku,
        defaultPrice: Number(variant.price),
        stockQuantity: variant.stock?.quantity ?? 0,
      })),
    };
  }

  async createManualBill(dto: CreateManualBillDto, organizationId: string) {
    if (!dto.items.length) {
      throw new BadRequestException('At least one billing item is required');
    }

    const variantIds = [...new Set(dto.items.map((item) => item.variantId))];
    const variants = await this.variantRepo
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.plant', 'plant')
      .where('variant.id IN (:...ids)', { ids: variantIds })
      .andWhere('variant.organizationId = :organizationId', { organizationId })
      .andWhere('variant.status = true')
      .andWhere('plant.status = true')
      .getMany();

    if (variants.length !== variantIds.length) {
      throw new NotFoundException('One or more plant variants not found');
    }

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    this.validateManualItems(dto.items, variantMap);

    const result = await this.dataSource.transaction(async (manager) => {
      for (const item of dto.items) {
        const stock = await manager.getRepository(PlantStock).findOne({
          where: { variantId: item.variantId, organizationId },
          lock: { mode: 'pessimistic_write' },
        });

        const available = stock?.quantity ?? 0;
        if (available < item.quantity) {
          const variant = variantMap.get(item.variantId)!;
          throw new BadRequestException(
            `Insufficient stock for "${variant.plant.name} (${variant.size})". Available: ${available}, requested: ${item.quantity}`,
          );
        }
      }

      let totalAmount = 0;
      const orderItems = dto.items.map((item) => {
        const unitPrice = Number(item.unitPrice);
        const totalPrice = Number((unitPrice * item.quantity).toFixed(2));
        totalAmount += totalPrice;

        return manager.getRepository(OrderItem).create({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });
      });

      const order = manager.getRepository(Order).create({
        organizationId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        totalAmount: Number(totalAmount.toFixed(2)),
        status: OrderStatus.CONFIRMED,
        items: orderItems,
      });
      const savedOrder = await manager.getRepository(Order).save(order);

      for (const item of dto.items) {
        await manager.getRepository(PlantStock).decrement(
          { variantId: item.variantId, organizationId },
          'quantity',
          item.quantity,
        );

        await manager.getRepository(StockLog).save(
          manager.getRepository(StockLog).create({
            variantId: item.variantId,
            organizationId,
            type: StockLogType.OUT,
            quantity: item.quantity,
            reference: `MANUAL-BILL-${savedOrder.id}`,
          }),
        );
      }

      const payment = manager.getRepository(Payment).create({
        orderId: savedOrder.id,
        organizationId,
        method: dto.paymentMethod,
        amount: Number(totalAmount.toFixed(2)),
        referenceNumber: dto.paymentReference?.trim() || `MANUAL-BILL-${savedOrder.id}`,
        notes: `Manual billing created for ${dto.customerName}`,
        status: PaymentStatus.COMPLETED,
      });
      const savedPayment = await manager.getRepository(Payment).save(payment);

      return { order: savedOrder, payment: savedPayment };
    });

    const invoiceUrl = await this.attachInvoice(
      result.order.id,
      result.payment.id,
      organizationId,
      dto.customerEmail,
    );

    return {
      ...result,
      invoiceUrl,
      message: 'Manual bill created successfully',
    };
  }

  private validateManualItems(
    items: ManualBillItemDto[],
    variantMap: Map<number, PlantVariant>,
  ) {
    for (const item of items) {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        throw new NotFoundException(`Plant variant #${item.variantId} not found`);
      }

      if (variant.plantId !== item.plantId) {
        throw new BadRequestException(
          `Variant #${item.variantId} does not belong to plant #${item.plantId}`,
        );
      }
    }
  }

  private async attachInvoice(
    orderId: number,
    paymentId: number,
    organizationId: string,
    customerEmail: string,
  ) {
    const [order, payment, org] = await Promise.all([
      this.dataSource.getRepository(Order).findOne({
        where: { id: orderId, organizationId },
        relations: ['items', 'items.variant', 'items.variant.plant', 'payment'],
      }),
      this.paymentRepo.findOne({
        where: { id: paymentId, organizationId },
      }),
      this.orgRepo.findOne({
        where: { id: organizationId },
      }),
    ]);

    if (!order || !payment || !org) {
      return null;
    }

    const invoiceUrl = await this.invoiceService.generateAndSend(
      order,
      payment,
      org,
      customerEmail,
    );

    payment.invoiceUrl = invoiceUrl;
    await this.paymentRepo.save(payment);

    return invoiceUrl;
  }
}
