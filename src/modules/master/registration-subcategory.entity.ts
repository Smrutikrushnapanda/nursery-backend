import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RegistrationCategory } from './registration-category.entity';

@Entity('registration_subcategories')
export class RegistrationSubCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => RegistrationCategory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: RegistrationCategory;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
