import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { SubCategory } from '../master/subcategory.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { PlantVariant } from './plant-variant.entity';

@Entity('plants')
@Index(['organizationId'])
@Index(['categoryId'])
@Index(['subcategoryId'])
@Index(['status'])
export class Plant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  sku: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'image_url' })
imageUrl: string;

  @Column({ name: 'care_instructions', type: 'text', nullable: true })
  careInstructions: string;

  @Column({ length: 50, nullable: true })
  season: string;

  @Column({ name: 'qr_code_url', nullable: true })
  qrCodeUrl: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @Column({ name: 'subcategory_id' })
  subcategoryId: number;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ default: true })
  status: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => SubCategory, { nullable: true })
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: SubCategory;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @OneToMany(() => PlantVariant, (variant) => variant.plant)
  variants: PlantVariant[];
}