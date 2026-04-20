import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlantVariant } from '../../plants/plant-variant.entity';

export enum StockLogType {
  IN = 'IN',
  OUT = 'OUT',
  DEAD = 'DEAD',
  ADJUST = 'ADJUST',
}

@Entity('stock_logs')
@Index('idx_stock_logs_organizationId', ['organizationId'])
@Index('idx_stock_logs_variantId', ['variantId'])
@Index('idx_stock_logs_createdAt', ['createdAt'])
@Check('CHK_stock_logs_quantity_non_negative', '"quantity" >= 0')
export class StockLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  variantId: number;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'enum', enum: StockLogType })
  type: StockLogType;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => PlantVariant, (variant) => variant.stockLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variantId' })
  variant: PlantVariant;
}
