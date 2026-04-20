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

@Entity('qr_codes')
@Index(['code'], { unique: true })
@Index(['plantId'])
export class QrCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  code: string;

  @Column({ name: 'plant_id' })
  plantId: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'qr_image_base64', type: 'text' })
  qrImageBase64: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Plant, { nullable: false })
  @JoinColumn({ name: 'plant_id' })
  plant: Plant;
}
