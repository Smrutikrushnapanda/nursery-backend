import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from '../plans/entities/plan.entity';
import { MenuMaster } from './menu-master.entity';

@Entity('plan_menu_access')
@Index(['planId', 'menuId'], { unique: true })
export class PlanMenuAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  planId: string;

  @Column()
  menuId: number;

  @Column({ default: true })
  status: boolean;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan: Plan;

  @ManyToOne(() => MenuMaster, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menuId' })
  menu: MenuMaster;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
