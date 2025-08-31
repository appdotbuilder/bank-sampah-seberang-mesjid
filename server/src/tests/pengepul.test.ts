import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { pengepulTable, jenisSampahTable, transaksiPenjualanTable } from '../db/schema';
import { type CreatePengepulInput, type UpdatePengepulInput } from '../schema';
import { 
  createPengepul, 
  getPengepul, 
  getPengepulById, 
  updatePengepul, 
  deletePengepul 
} from '../handlers/pengepul';
import { eq } from 'drizzle-orm';

// Test input data
const testPengepulInput: CreatePengepulInput = {
  kode: 'PGP001',
  nama: 'CV Jaya Sampah',
  alamat: 'Jl. Raya Industri No. 123, Jakarta'
};

const secondPengepulInput: CreatePengepulInput = {
  kode: 'PGP002',
  nama: 'PT Maju Sejahtera',
  alamat: 'Jl. Kemerdekaan No. 456, Surabaya'
};

describe('pengepul handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createPengepul', () => {
    it('should create a pengepul successfully', async () => {
      const result = await createPengepul(testPengepulInput);

      expect(result.kode).toEqual('PGP001');
      expect(result.nama).toEqual('CV Jaya Sampah');
      expect(result.alamat).toEqual('Jl. Raya Industri No. 123, Jakarta');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save pengepul to database', async () => {
      const result = await createPengepul(testPengepulInput);

      const pengepulInDb = await db.select()
        .from(pengepulTable)
        .where(eq(pengepulTable.id, result.id))
        .execute();

      expect(pengepulInDb).toHaveLength(1);
      expect(pengepulInDb[0].kode).toEqual('PGP001');
      expect(pengepulInDb[0].nama).toEqual('CV Jaya Sampah');
      expect(pengepulInDb[0].alamat).toEqual('Jl. Raya Industri No. 123, Jakarta');
      expect(pengepulInDb[0].created_at).toBeInstanceOf(Date);
    });

    it('should reject duplicate kode', async () => {
      await createPengepul(testPengepulInput);

      await expect(createPengepul(testPengepulInput))
        .rejects.toThrow(/already exists/i);
    });

    it('should allow different pengepul with unique kode', async () => {
      await createPengepul(testPengepulInput);
      const result = await createPengepul(secondPengepulInput);

      expect(result.kode).toEqual('PGP002');
      expect(result.nama).toEqual('PT Maju Sejahtera');
    });
  });

  describe('getPengepul', () => {
    it('should return empty array when no pengepul exist', async () => {
      const result = await getPengepul();
      expect(result).toEqual([]);
    });

    it('should return all pengepul', async () => {
      await createPengepul(testPengepulInput);
      await createPengepul(secondPengepulInput);

      const result = await getPengepul();

      expect(result).toHaveLength(2);
      expect(result[0].kode).toEqual('PGP001');
      expect(result[1].kode).toEqual('PGP002');
    });

    it('should return pengepul ordered by creation', async () => {
      await createPengepul(testPengepulInput);
      await createPengepul(secondPengepulInput);

      const result = await getPengepul();

      expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
    });
  });

  describe('getPengepulById', () => {
    it('should return null for non-existent ID', async () => {
      const result = await getPengepulById(999);
      expect(result).toBeNull();
    });

    it('should return pengepul for valid ID', async () => {
      const created = await createPengepul(testPengepulInput);
      const result = await getPengepulById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.kode).toEqual('PGP001');
      expect(result!.nama).toEqual('CV Jaya Sampah');
    });

    it('should return correct pengepul when multiple exist', async () => {
      const first = await createPengepul(testPengepulInput);
      const second = await createPengepul(secondPengepulInput);

      const result = await getPengepulById(second.id);

      expect(result!.id).toEqual(second.id);
      expect(result!.kode).toEqual('PGP002');
      expect(result!.nama).toEqual('PT Maju Sejahtera');
    });
  });

  describe('updatePengepul', () => {
    it('should reject update for non-existent pengepul', async () => {
      const updateInput: UpdatePengepulInput = {
        id: 999,
        nama: 'Updated Name'
      };

      await expect(updatePengepul(updateInput))
        .rejects.toThrow(/not found/i);
    });

    it('should update pengepul nama only', async () => {
      const created = await createPengepul(testPengepulInput);
      
      const updateInput: UpdatePengepulInput = {
        id: created.id,
        nama: 'CV Jaya Sampah Updated'
      };

      const result = await updatePengepul(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.nama).toEqual('CV Jaya Sampah Updated');
      expect(result.kode).toEqual('PGP001'); // Should remain unchanged
      expect(result.alamat).toEqual('Jl. Raya Industri No. 123, Jakarta'); // Should remain unchanged
    });

    it('should update pengepul alamat only', async () => {
      const created = await createPengepul(testPengepulInput);
      
      const updateInput: UpdatePengepulInput = {
        id: created.id,
        alamat: 'Jl. Baru No. 789, Bandung'
      };

      const result = await updatePengepul(updateInput);

      expect(result.alamat).toEqual('Jl. Baru No. 789, Bandung');
      expect(result.kode).toEqual('PGP001'); // Should remain unchanged
      expect(result.nama).toEqual('CV Jaya Sampah'); // Should remain unchanged
    });

    it('should update pengepul kode successfully', async () => {
      const created = await createPengepul(testPengepulInput);
      
      const updateInput: UpdatePengepulInput = {
        id: created.id,
        kode: 'PGP999'
      };

      const result = await updatePengepul(updateInput);

      expect(result.kode).toEqual('PGP999');
      expect(result.nama).toEqual('CV Jaya Sampah'); // Should remain unchanged
    });

    it('should reject duplicate kode during update', async () => {
      const first = await createPengepul(testPengepulInput);
      await createPengepul(secondPengepulInput);

      const updateInput: UpdatePengepulInput = {
        id: first.id,
        kode: 'PGP002' // Already exists
      };

      await expect(updatePengepul(updateInput))
        .rejects.toThrow(/already exists/i);
    });

    it('should allow keeping same kode during update', async () => {
      const created = await createPengepul(testPengepulInput);
      
      const updateInput: UpdatePengepulInput = {
        id: created.id,
        kode: 'PGP001', // Same as current
        nama: 'Updated Name'
      };

      const result = await updatePengepul(updateInput);

      expect(result.kode).toEqual('PGP001');
      expect(result.nama).toEqual('Updated Name');
    });

    it('should update multiple fields simultaneously', async () => {
      const created = await createPengepul(testPengepulInput);
      
      const updateInput: UpdatePengepulInput = {
        id: created.id,
        kode: 'PGP999',
        nama: 'CV Updated Sejahtera',
        alamat: 'Jl. Baru No. 999, Medan'
      };

      const result = await updatePengepul(updateInput);

      expect(result.kode).toEqual('PGP999');
      expect(result.nama).toEqual('CV Updated Sejahtera');
      expect(result.alamat).toEqual('Jl. Baru No. 999, Medan');
    });

    it('should persist changes to database', async () => {
      const created = await createPengepul(testPengepulInput);
      
      const updateInput: UpdatePengepulInput = {
        id: created.id,
        nama: 'Persisted Update'
      };

      await updatePengepul(updateInput);

      const pengepulInDb = await db.select()
        .from(pengepulTable)
        .where(eq(pengepulTable.id, created.id))
        .execute();

      expect(pengepulInDb[0].nama).toEqual('Persisted Update');
    });
  });

  describe('deletePengepul', () => {
    it('should reject deletion of non-existent pengepul', async () => {
      await expect(deletePengepul(999))
        .rejects.toThrow(/not found/i);
    });

    it('should delete pengepul successfully', async () => {
      const created = await createPengepul(testPengepulInput);

      await deletePengepul(created.id);

      const pengepulInDb = await db.select()
        .from(pengepulTable)
        .where(eq(pengepulTable.id, created.id))
        .execute();

      expect(pengepulInDb).toHaveLength(0);
    });

    it('should reject deletion when pengepul has transaction history', async () => {
      // Create test pengepul
      const pengepul = await createPengepul(testPengepulInput);

      // Create jenis sampah for transaction
      const jenisSampah = await db.insert(jenisSampahTable)
        .values({
          kode: 'JS001',
          jenis_sampah: 'Plastik',
          harga_beli: '5000',
          harga_jual: '6000'
        })
        .returning()
        .execute();

      // Create transaction that references the pengepul
      await db.insert(transaksiPenjualanTable)
        .values({
          pengepul_id: pengepul.id,
          jenis_sampah_id: jenisSampah[0].id,
          berat: '10.5',
          harga_per_kg: '6000',
          total_penjualan: '63000'
        })
        .execute();

      await expect(deletePengepul(pengepul.id))
        .rejects.toThrow(/transaction history/i);
    });

    it('should allow deletion when no transaction history exists', async () => {
      const pengepul = await createPengepul(testPengepulInput);

      // Should not throw
      await deletePengepul(pengepul.id);

      const result = await getPengepulById(pengepul.id);
      expect(result).toBeNull();
    });

    it('should only delete specified pengepul', async () => {
      const first = await createPengepul(testPengepulInput);
      const second = await createPengepul(secondPengepulInput);

      await deletePengepul(first.id);

      const firstResult = await getPengepulById(first.id);
      const secondResult = await getPengepulById(second.id);

      expect(firstResult).toBeNull();
      expect(secondResult).not.toBeNull();
      expect(secondResult!.kode).toEqual('PGP002');
    });
  });
});