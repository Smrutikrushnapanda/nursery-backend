import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payments/entities/payment.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

@Entity('orders')
@Index(['organizationId'])
@Index(['status'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'customer_name', length: 150, nullable: true })
  customerName: string;

  @Column({ name: 'customer_phone', length: 25, nullable: true })
  customerPhone: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ name: 'discount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  discount: number;

  @Column({ name: 'discount_type', type: 'varchar', length: 10, default: 'fixed', nullable: true })
  discountType: 'fixed' | 'percentage';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Payment;
}
