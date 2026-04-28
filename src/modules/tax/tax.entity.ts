import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';

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

@Entity('tax')
@Index(['organizationId'])
@Index(['organizationId', 'status'])
export class Tax {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ name: 'tax_type', length: 80 })
  taxType: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: decimalToNumberTransformer,
  })
  percentage: number;

  @Column({ default: true })
  status: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
