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
import { PlantImage } from './plant-image.entity';

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

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'care_instructions', type: 'text', nullable: true })
  careInstructions: string;

  @Column({ name: 'water_requirement', length: 100, nullable: true })
  waterRequirement: string;

  @Column({ name: 'sunlight_requirement', length: 100, nullable: true })
  sunlightRequirement: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureMin: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureMax: number;

  @Column({ name: 'humidity_level', length: 50, nullable: true })
  humidityLevel: string;

  @Column({ name: 'soil_type', length: 100, nullable: true })
  soilType: string;

  @Column({ name: 'fertilizing_frequency', length: 100, nullable: true })
  fertilizingFrequency: string;

  @Column({ name: 'pruning_frequency', length: 100, nullable: true })
  pruningFrequency: string;

  @Column({ name: 'scientific_name', length: 255, nullable: true })
  scientificName: string;

  @Column({ length: 50, nullable: true })
  season: string;

  @Column({ name: 'qr_code_url', nullable: true })
  qrCodeUrl: string;

  @Column({ name: 'pet_toxicity', type: 'varchar', length: 50, nullable: true })
  petToxicity: string;

  @Column({ name: 'pet_toxicity_notes', type: 'text', nullable: true })
  petToxicityNotes: string;

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

  @OneToMany(() => PlantImage, (image) => image.plant)
  images: PlantImage[];
}
