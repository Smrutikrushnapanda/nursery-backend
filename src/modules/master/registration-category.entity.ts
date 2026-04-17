import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RegistrationSubCategory } from './registration-subcategory.entity';

@Entity('registration_categories')
export class RegistrationCategory {
  @PrimaryColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  status: boolean;

  @OneToMany(
    () => RegistrationSubCategory,
    (registrationSubCategory) => registrationSubCategory.category,
  )
  subCategories: RegistrationSubCategory[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
