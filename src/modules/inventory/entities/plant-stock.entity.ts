import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PlantVariant } from '../../plants/plant-variant.entity';

@Entity('plant_stock')
@Index('idx_plant_stock_organizationId', ['organizationId'])
@Index('idx_plant_stock_variantId', ['variantId'])
@Unique('UQ_plant_stock_organization_variant', ['organizationId', 'variantId'])
@Check('CHK_plant_stock_quantity_non_negative', '"quantity" >= 0')
export class PlantStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  variantId: number;

  @Column({ type: 'uuid' })
  organizationId: string;

  @Column({ type: 'integer', default: 0 })
  quantity: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => PlantVariant, (variant) => variant.stock, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'variantId' })
  variant: PlantVariant;
}
