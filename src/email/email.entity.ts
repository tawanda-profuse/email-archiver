import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Email {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: string;

  @Column()
  threadId: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column()
  sender: string;

  @Column()
  recipients: string;

  @Column()
  cc: string;

  @Column({ nullable: true })
  bcc: string;

  @CreateDateColumn()
  receivedAt: Date;

  @Column({ type: 'simple-array', nullable: true })
  googleDriveLinks: string[] | null;
}
