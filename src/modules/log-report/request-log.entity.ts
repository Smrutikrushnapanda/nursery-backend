import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('request_logs')
@Index('idx_request_logs_userId', ['userId'])
@Index('idx_request_logs_createdAt', ['createdAt'])
@Index('idx_request_logs_statusCode', ['statusCode'])
export class RequestLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10 })
  method: string;

  @Column({ length: 500 })
  endpoint: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ip: string | null;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  @CreateDateColumn()
  createdAt: Date;
}