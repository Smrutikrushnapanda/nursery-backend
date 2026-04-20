import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { StockLog, StockLogType } from '../inventory/entities/stock-log.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(PlantStock)
    private readonly stockRepo: Repository<PlantStock>,
  ) {}

  async getSales(organizationId: string, type: 'daily' | 'weekly' | 'monthly') {
    const groupFormat = { daily: '%Y-%m-%d', weekly: '%Y-%u', monthly: '%Y-%m' };
    const format = groupFormat[type] ?? groupFormat.daily;

    const isMySQL = this.orderRepo.manager.connection.options.type !== 'postgres';

    const dateExpr = isMySQL
      ? `DATE_FORMAT(o.created_at, '${format}')`
      : `TO_CHAR(o.created_at, '${format.replace('%Y', 'YYYY').replace('%m', 'MM').replace('%d', 'DD').replace('%u', 'IW')}')`;

    const rows = await this.orderRepo
      .createQueryBuilder('o')
      .select(dateExpr, 'period')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect('SUM(o.total_amount)', 'revenue')
      .where('o.organization_id = :organizationId', { organizationId })
      .andWhere('o.status = :status', { status: OrderStatus.CONFIRMED })
      .groupBy(dateExpr)
      .orderBy(dateExpr, 'ASC')
      .getRawMany<{ period: string; orderCount: string; revenue: string }>();

    return rows.map((r) => ({
      period: r.period,
      orderCount: Number(r.orderCount),
      revenue: parseFloat(r.revenue ?? '0'),
    }));
  }

  async getTopPlants(organizationId: string, limit = 10) {
    const rows = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.variant', 'v')
      .innerJoin('v.plant', 'p')
      .select('p.id', 'plantId')
      .addSelect('p.name', 'plantName')
      .addSelect('SUM(oi.quantity)', 'totalSold')
      .addSelect('SUM(oi.total_price)', 'totalRevenue')
      .where('o.organization_id = :organizationId', { organizationId })
      .andWhere('o.status = :status', { status: OrderStatus.CONFIRMED })
      .groupBy('p.id')
      .addGroupBy('p.name')
      .orderBy('SUM(oi.quantity)', 'DESC')
      .limit(limit)
      .getRawMany<{ plantId: number; plantName: string; totalSold: string; totalRevenue: string }>();

    return rows.map((r) => ({
      plantId: r.plantId,
      plantName: r.plantName,
      totalSold: Number(r.totalSold),
      totalRevenue: parseFloat(r.totalRevenue ?? '0'),
    }));
  }

  async getInventoryValue(organizationId: string) {
    const rows = await this.stockRepo
      .createQueryBuilder('ps')
      .innerJoin('ps.variant', 'v')
      .innerJoin('v.plant', 'p')
      .select('p.id', 'plantId')
      .addSelect('p.name', 'plantName')
      .addSelect('v.id', 'variantId')
      .addSelect('v.size', 'size')
      .addSelect('v.sku', 'sku')
      .addSelect('v.price', 'unitPrice')
      .addSelect('ps.quantity', 'stockQty')
      .addSelect('CAST(v.price AS DECIMAL) * ps.quantity', 'stockValue')
      .where('ps.organizationId = :organizationId', { organizationId })
      .getRawMany<{
        plantId: number;
        plantName: string;
        variantId: number;
        size: string;
        sku: string;
        unitPrice: string;
        stockQty: number;
        stockValue: string;
      }>();

    const totalValue = rows.reduce((sum, r) => sum + parseFloat(r.stockValue ?? '0'), 0);

    return {
      totalValue: parseFloat(totalValue.toFixed(2)),
      items: rows.map((r) => ({
        plantId: r.plantId,
        plantName: r.plantName,
        variantId: r.variantId,
        size: r.size,
        sku: r.sku,
        unitPrice: parseFloat(r.unitPrice),
        stockQty: Number(r.stockQty),
        stockValue: parseFloat(parseFloat(r.stockValue ?? '0').toFixed(2)),
      })),
    };
  }
}
