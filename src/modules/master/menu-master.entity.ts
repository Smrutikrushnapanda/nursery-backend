import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('menu_master')
export class MenuMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  menuName: string;

  @Column({ length: 500, nullable: true })
  path: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  @ManyToOne('MenuMaster', (menuMaster: MenuMaster) => menuMaster.children, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: MenuMaster;

  @OneToMany('MenuMaster', (menuMaster: MenuMaster) => menuMaster.parent)
  children: MenuMaster[];

  @Column({ length: 100, nullable: true })
  icon: string;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_visible', default: true })
  isVisible: boolean;

  @Column({ default: true })
  status: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}