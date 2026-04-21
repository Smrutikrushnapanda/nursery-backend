import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Plant } from './plant.entity';

@Entity('plant_images')
@Index(['plantId'])
@Index(['organizationId'])
export class PlantImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: false })
  imageUrl: string;

  @Column({ name: 'plant_id' })
  plantId: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Plant, (plant) => plant.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plant_id' })
  plant: Plant;
}
