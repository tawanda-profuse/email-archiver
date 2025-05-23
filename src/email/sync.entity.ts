import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class SyncState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userEmail: string;

  @Column()
  historyId: string;
}
