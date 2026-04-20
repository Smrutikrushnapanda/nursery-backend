import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PlanFeature {
  INVENTORY = 'INVENTORY',
  BILLING = 'BILLING',
  POS = 'POS',
  REPORTS = 'REPORTS',
  PAYMENTS = 'PAYMENTS',
  QR = 'QR',
  ANALYTICS = 'ANALYTICS',
}

export enum PlanName {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PlanName, unique: true })
  name: PlanName;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'json' })
  features: PlanFeature[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
