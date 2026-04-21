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

@Entity('qr_scan_logs')
@Index(['qrCode'])
@Index(['plantId'])
@Index(['organizationId'])
@Index(['scannedAt'])
export class QrScanLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  qrCode: string;

  @Column({ name: 'plant_id' })
  plantId: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'scanned_by', type: 'uuid', nullable: true })
  scannedBy: string;

  @Column({ name: 'scan_location', length: 255, nullable: true })
  scanLocation: string;

  @Column({ name: 'device_info', length: 255, nullable: true })
  deviceInfo: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'scanned_at' })
  scannedAt: Date;

  @ManyToOne(() => Plant, { nullable: false })
  @JoinColumn({ name: 'plant_id' })
  plant: Plant;
}