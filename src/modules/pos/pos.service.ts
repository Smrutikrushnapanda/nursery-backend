import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlantVariant } from '../plants/plant-variant.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { OrdersService } from '../orders/orders.service';
import { InvoiceService } from '../invoices/invoice.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { PaymentMethod } from '../payments/entities/payment.entity';

export class QuickOrderItemDto {
  variantId: number;
  quantity: number;
}

export class QuickOrderDto {
  items: QuickOrderItemDto[];
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(PlantVariant)
    private readonly variantRepo: Repository<PlantVariant>,
    @InjectRepository(PlantStock)
    private readonly stockRepo: Repository<PlantStock>,
    private readonly ordersService: OrdersService,
    private readonly invoiceService: InvoiceService,
    private readonly orgsService: OrganizationsService,
  ) {}

  async getCatalog(organizationId: string) {
    const variants = await this.variantRepo
      .createQueryBuilder('v')
      .select([
        'v.id',
        'v.size',
        'v.sku',
        'v.price',
        'v.barcode',
        'p.id',
        'p.name',
        'p.imageUrl',
        'p.categoryId',
        's.quantity',
      ])
      .innerJoin('v.plant', 'p')
      .leftJoin('v.stock', 's')
      .where('v.organizationId = :organizationId', { organizationId })
      .andWhere('v.status = true')
      .andWhere('p.status = true')
      .orderBy('p.name', 'ASC')
      .addOrderBy('v.size', 'ASC')
      .getMany();

    return variants.map((v) => ({
      variantId: v.id,
      sku: v.sku,
      barcode: v.barcode ?? null,
      size: v.size,
      price: Number(v.price),
      stock: Number((v as any).stock?.quantity ?? 0),
      plant: {
        id: v.plant.id,
        name: v.plant.name,
        imageUrl: v.plant.imageUrl,
        categoryId: v.plant.categoryId,
      },
    }));
  }

  async quickOrder(dto: QuickOrderDto, organizationId: string) {
    const result = await this.ordersService.create(
      {
        items: dto.items,
        paymentMethod: dto.paymentMethod,
        paymentReference: dto.paymentReference,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
      },
      organizationId,
    );

    // Fire-and-forget invoice generation + email
    if (dto.customerEmail) {
      const org = await this.orgsService.findOne(organizationId);
      this.invoiceService
        .generateAndSend(result.order, result.payment, org, dto.customerEmail)
        .then((invoiceUrl) => {
          result.payment.invoiceUrl = invoiceUrl;
        })
        .catch(() => null);
    }

    return {
      orderId: result.order.id,
      totalAmount: Number(result.order.totalAmount),
      paymentMethod: result.payment.method,
      status: result.order.status,
      invoiceUrl: result.payment.invoiceUrl ?? null,
      items: result.order.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.totalPrice),
      })),
    };
  }
}
