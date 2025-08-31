import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { nasabahTable, transaksiSetoranTable, jenisSampahTable } from '../db/schema';
import { type CreateNasabahInput, type UpdateNasabahInput } from '../schema';
import { createNasabah, getNasabah, getNasabahById, updateNasabah, deleteNasabah } from '../handlers/nasabah';
import { eq } from 'drizzle-orm';

// Test input data
const testNasabahInput: CreateNasabahInput = {
  kode: 'NSB001',
  nama: 'John Doe',
  nik_nip: '1234567890',
  alamat: 'Jl. Test No. 1',
  instansi: 'PT Test Company'
};

const testNasabahInputWithoutInstansi: CreateNasabahInput = {
  kode: 'NSB002',
  nama: 'Jane Smith',
  nik_nip: '0987654321',
  alamat: 'Jl. Test No. 2',
  instansi: null
};

describe('Nasabah Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createNasabah', () => {
    it('should create a nasabah with instansi', async () => {
      const result = await createNasabah(testNasabahInput);

      expect(result.kode).toEqual('NSB001');
      expect(result.nama).toEqual('John Doe');
      expect(result.nik_nip).toEqual('1234567890');
      expect(result.alamat).toEqual('Jl. Test No. 1');
      expect(result.instansi).toEqual('PT Test Company');
      expect(result.saldo).toEqual(0);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(typeof result.saldo).toBe('number');
    });

    it('should create a nasabah without instansi', async () => {
      const result = await createNasabah(testNasabahInputWithoutInstansi);

      expect(result.kode).toEqual('NSB002');
      expect(result.nama).toEqual('Jane Smith');
      expect(result.instansi).toBeNull();
      expect(result.saldo).toEqual(0);
      expect(typeof result.saldo).toBe('number');
    });

    it('should save nasabah to database', async () => {
      const result = await createNasabah(testNasabahInput);

      const nasabahInDb = await db.select()
        .from(nasabahTable)
        .where(eq(nasabahTable.id, result.id))
        .execute();

      expect(nasabahInDb).toHaveLength(1);
      expect(nasabahInDb[0].kode).toEqual('NSB001');
      expect(nasabahInDb[0].nama).toEqual('John Doe');
      expect(parseFloat(nasabahInDb[0].saldo)).toEqual(0);
    });

    it('should throw error for duplicate kode', async () => {
      await createNasabah(testNasabahInput);

      await expect(createNasabah(testNasabahInput)).rejects.toThrow();
    });
  });

  describe('getNasabah', () => {
    it('should return empty array when no nasabah exist', async () => {
      const result = await getNasabah();
      expect(result).toEqual([]);
    });

    it('should return all nasabah', async () => {
      await createNasabah(testNasabahInput);
      await createNasabah(testNasabahInputWithoutInstansi);

      const result = await getNasabah();
      
      expect(result).toHaveLength(2);
      expect(result[0].kode).toEqual('NSB001');
      expect(result[1].kode).toEqual('NSB002');
      expect(typeof result[0].saldo).toBe('number');
      expect(typeof result[1].saldo).toBe('number');
    });
  });

  describe('getNasabahById', () => {
    it('should return null for non-existent nasabah', async () => {
      const result = await getNasabahById(999);
      expect(result).toBeNull();
    });

    it('should return nasabah by ID', async () => {
      const created = await createNasabah(testNasabahInput);
      const result = await getNasabahById(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toEqual(created.id);
      expect(result!.kode).toEqual('NSB001');
      expect(result!.nama).toEqual('John Doe');
      expect(typeof result!.saldo).toBe('number');
    });
  });

  describe('updateNasabah', () => {
    it('should throw error for non-existent nasabah', async () => {
      const updateInput: UpdateNasabahInput = {
        id: 999,
        nama: 'Updated Name'
      };

      await expect(updateNasabah(updateInput)).rejects.toThrow(/not found/i);
    });

    it('should update nasabah with partial data', async () => {
      const created = await createNasabah(testNasabahInput);
      
      const updateInput: UpdateNasabahInput = {
        id: created.id,
        nama: 'Updated John Doe',
        alamat: 'Jl. Updated No. 1'
      };

      const result = await updateNasabah(updateInput);

      expect(result.id).toEqual(created.id);
      expect(result.nama).toEqual('Updated John Doe');
      expect(result.alamat).toEqual('Jl. Updated No. 1');
      expect(result.kode).toEqual('NSB001'); // Unchanged
      expect(result.nik_nip).toEqual('1234567890'); // Unchanged
      expect(typeof result.saldo).toBe('number');
    });

    it('should update all fields when provided', async () => {
      const created = await createNasabah(testNasabahInput);
      
      const updateInput: UpdateNasabahInput = {
        id: created.id,
        kode: 'NSB999',
        nama: 'Completely Updated',
        nik_nip: '9999999999',
        alamat: 'Jl. New Address',
        instansi: 'New Company'
      };

      const result = await updateNasabah(updateInput);

      expect(result.kode).toEqual('NSB999');
      expect(result.nama).toEqual('Completely Updated');
      expect(result.nik_nip).toEqual('9999999999');
      expect(result.alamat).toEqual('Jl. New Address');
      expect(result.instansi).toEqual('New Company');
    });

    it('should handle instansi set to null', async () => {
      const created = await createNasabah(testNasabahInput);
      
      const updateInput: UpdateNasabahInput = {
        id: created.id,
        instansi: null
      };

      const result = await updateNasabah(updateInput);
      expect(result.instansi).toBeNull();
    });

    it('should throw error for duplicate kode', async () => {
      const created1 = await createNasabah(testNasabahInput);
      const created2 = await createNasabah(testNasabahInputWithoutInstansi);
      
      const updateInput: UpdateNasabahInput = {
        id: created2.id,
        kode: 'NSB001' // Try to use existing kode
      };

      await expect(updateNasabah(updateInput)).rejects.toThrow();
    });
  });

  describe('deleteNasabah', () => {
    it('should throw error for non-existent nasabah', async () => {
      await expect(deleteNasabah(999)).rejects.toThrow(/not found/i);
    });

    it('should delete nasabah without transactions', async () => {
      const created = await createNasabah(testNasabahInput);
      
      await deleteNasabah(created.id);

      const result = await getNasabahById(created.id);
      expect(result).toBeNull();
    });

    it('should throw error when nasabah has transaction history', async () => {
      // First create a nasabah
      const created = await createNasabah(testNasabahInput);

      // Create a jenis sampah for the transaction
      await db.insert(jenisSampahTable)
        .values({
          kode: 'JS001',
          jenis_sampah: 'Plastik',
          harga_beli: '5000',
          harga_jual: '6000'
        })
        .execute();

      const jenisSampah = await db.select()
        .from(jenisSampahTable)
        .where(eq(jenisSampahTable.kode, 'JS001'))
        .execute();

      // Create a transaction for the nasabah
      await db.insert(transaksiSetoranTable)
        .values({
          nasabah_id: created.id,
          jenis_sampah_id: jenisSampah[0].id,
          berat: '10.5',
          harga_per_kg: '5000',
          total_setoran: '52500'
        })
        .execute();

      // Try to delete nasabah - should fail
      await expect(deleteNasabah(created.id)).rejects.toThrow(/transaction history/i);
    });

    it('should verify nasabah is removed from database', async () => {
      const created = await createNasabah(testNasabahInput);
      
      await deleteNasabah(created.id);

      const nasabahInDb = await db.select()
        .from(nasabahTable)
        .where(eq(nasabahTable.id, created.id))
        .execute();

      expect(nasabahInDb).toHaveLength(0);
    });
  });
});