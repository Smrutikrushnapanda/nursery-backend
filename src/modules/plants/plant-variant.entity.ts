import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ValueTransformer,
} from 'typeorm';
import { Plant } from './plant.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { StockLog } from '../inventory/entities/stock-log.entity';

export enum PlantVariantSize {
  TINY = 'TINY',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  EXTRA_LARGE = 'EXTRA_LARGE',
}

const decimalToNumberTransformer: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null): number | null => {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  },
};

@Entity('plant_variants')
@Index('idx_plant_variants_organizationId', ['organizationId'])
@Index('idx_plant_variants_plantId', ['plantId'])
@Index('idx_plant_variants_status', ['status'])
@Unique('UQ_organization_sku', ['organizationId', 'sku'])
export class PlantVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  plantId: number;

  @Column({ nullable: true })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: PlantVariantSize,
    default: PlantVariantSize.MEDIUM,
  })
  size: PlantVariantSize;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  price: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumberTransformer,
  })
  mockPrice: number | null;

  @Column({ length: 100 })
  sku: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalToNumberTransformer,
  })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalToNumberTransformer,
  })
  minQuantity: number;

  @Column({ nullable: true })
  barcode: string;

  @Column({ default: true })
  status: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Plant, (plant) => plant.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plantId' })
  plant: Plant;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @OneToOne(() => PlantStock, (stock) => stock.variant)
  stock: PlantStock;

  @OneToMany(() => StockLog, (stockLog) => stockLog.variant)
  stockLogs: StockLog[];
}
