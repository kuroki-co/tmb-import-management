import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { CreateFriDto, FriDto } from './fri.dto.js';
import { validateFri } from './fri.validation.js';
type Row = {
  id: string;
  created_at: Date;
  status: string;
  code: string;
  data: CreateFriDto;
};
const map = (row: Row): FriDto => ({
  id: row.id,
  createdAt: new Date(row.created_at).toISOString(),
  status: row.status,
  code: row.code,
  data: row.data,
});
@Injectable()
export class FriService {
  constructor(private readonly db: Sequelize) {}
  async create(input: CreateFriDto) {
    const data = validateFri(input);
    const id = randomUUID();
    const token = randomBytes(32).toString('hex');
    await this.db.transaction(async (transaction) => {
      const [counter] = await this.db.query<{ last_value: string }>(
        "UPDATE document_counters SET last_value = last_value + 1 WHERE name = 'fri' RETURNING last_value",
        { transaction, type: QueryTypes.SELECT },
      );
      if (!counter)
        throw new Error('Contador FRI no configurado. Aplica las migraciones.');
      const code = `TMB-${counter.last_value.toString().padStart(6, '0')}`;
      await this.db.query(
        'INSERT INTO fri_requests (id, code, data, receipt_hash) VALUES (:id, :code, CAST(:data AS jsonb), :hash)',
        {
          replacements: {
            id,
            code,
            data: JSON.stringify(data),
            hash: createHash('sha256').update(token).digest('hex'),
          },
          transaction,
        },
      );
    });
    return { id, receiptToken: token };
  }
  async list(): Promise<FriDto[]> {
    return (
      await this.db.query<Row>(
        'SELECT id, created_at, status, code, data FROM fri_requests ORDER BY created_at DESC LIMIT 500',
        { type: QueryTypes.SELECT },
      )
    ).map(map);
  }
  async find(id: string, token?: string): Promise<FriDto> {
    const [row] = await this.db.query<Row>(
      `SELECT id, created_at, status, code, data FROM fri_requests WHERE id = :id${token !== undefined ? ' AND receipt_hash = :hash' : ''}`,
      {
        replacements: {
          id,
          hash: createHash('sha256')
            .update(token ?? '')
            .digest('hex'),
        },
        type: QueryTypes.SELECT,
      },
    );
    if (!row) throw new NotFoundException('Solicitud no encontrada');
    return map(row);
  }
  async beginReview(id: string): Promise<FriDto> {
    const [row] = await this.db.query<Row>(
      "UPDATE fri_requests SET status = 'En revisión' WHERE id = :id AND status = 'Pendiente a revisar' RETURNING id, created_at, status, code, data",
      { replacements: { id }, type: QueryTypes.SELECT },
    );
    return row ? map(row) : this.find(id);
  }
}
