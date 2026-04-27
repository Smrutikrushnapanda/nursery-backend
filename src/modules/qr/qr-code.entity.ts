import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Plant } from '../plants/plant.entity';
import { PlantVariant } from '../plants/plant-variant.entity';

@Entity('qr_codes')
@Index(['code'], { unique: true })
@Index(['plantId'])
@Index(['plantId', 'variantId'], { unique: true })
export class QrCode {
  @PrimaryGeneratedColumn()
  id: number;

@Column({ unique: true, length: 500, nullable: true })
code: string;

  @Column({ name: 'plant_id' })
  plantId: number;

  @Column({ name: 'variant_id', nullable: true, type: 'int' })
  variantId: number | null;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'qr_image_base64', type: 'text' })
  qrImageBase64: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Plant, { nullable: false })
  @JoinColumn({ name: 'plant_id' })
  plant: Plant;

  @ManyToOne(() => PlantVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant: PlantVariant | null;
}
