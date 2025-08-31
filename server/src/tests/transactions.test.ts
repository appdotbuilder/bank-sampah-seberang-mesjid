import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  nasabahTable,
  jenisSampahTable,
  pengepulTable,
  transaksiSetoranTable,
  transaksiTarikSaldoTable,
  transaksiPenjualanTable
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { 
  type CreateTransaksiSetoranInput,
  type CreateTransaksiTarikSaldoInput,
  type CreateTransaksiPenjualanInput
} from '../schema';
import { 
  createTransaksiSetoran,
  createTransaksiTarikSaldo,
  createTransaksiPenjualan,
  getTransaksiSetoran,
  getTransaksiTarikSaldo,
  getTransaksiPenjualan
} from '../handlers/transactions';

// Test data setup
let nasabahId: number;
let jenisSampahId: number;
let pengepulId: number;

const setupTestData = async () => {
  // Create nasabah
  const nasabahResult = await db.insert(nasabahTable)
    .values({
      kode: 'NSB001',
      nama: 'Test Nasabah',
      nik_nip: '1234567890',
      alamat: 'Test Address',
      instansi: 'Test Institution',
      saldo: '50000.00'
    })
    .returning()
    .execute();
  nasabahId = nasabahResult[0].id;

  // Create jenis sampah
  const jenisSampahResult = await db.insert(jenisSampahTable)
    .values({
      kode: 'JS001',
      jenis_sampah: 'Plastik PET',
      harga_beli: '5000.00',
      harga_jual: '6000.00'
    })
    .returning()
    .execute();
  jenisSampahId = jenisSampahResult[0].id;

  // Create pengepul
  const pengepulResult = await db.insert(pengepulTable)
    .values({
      kode: 'PGL001',
      nama: 'Test Pengepul',
      alamat: 'Pengepul Address'
    })
    .returning()
    .execute();
  pengepulId = pengepulResult[0].id;
};

describe('Transaction Handlers', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });

  afterEach(resetDB);

  describe('createTransaksiSetoran', () => {
    const testInput: CreateTransaksiSetoranInput = {
      nasabah_id: 0, // Will be set dynamically
      jenis_sampah_id: 0, // Will be set dynamically
      berat: 2.5
    };

    it('should create a deposit transaction', async () => {
      testInput.nasabah_id = nasabahId;
      testInput.jenis_sampah_id = jenisSampahId;

      const result = await createTransaksiSetoran(testInput);

      expect(result.nasabah_id).toEqual(nasabahId);
      expect(result.jenis_sampah_id).toEqual(jenisSampahId);
      expect(result.berat).toEqual(2.5);
      expect(result.harga_per_kg).toEqual(5000);
      expect(result.total_setoran).toEqual(12500); // 2.5 * 5000
      expect(result.id).toBeDefined();
      expect(result.tanggal).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should update nasabah saldo correctly', async () => {
      testInput.nasabah_id = nasabahId;
      testInput.jenis_sampah_id = jenisSampahId;

      await createTransaksiSetoran(testInput);

      const updatedNasabah = await db.select()
        .from(nasabahTable)
        .where(eq(nasabahTable.id, nasabahId))
        .execute();

      expect(parseFloat(updatedNasabah[0].saldo)).toEqual(62500); // 50000 + 12500
    });

    it('should save transaction to database', async () => {
      testInput.nasabah_id = nasabahId;
      testInput.jenis_sampah_id = jenisSampahId;

      const result = await createTransaksiSetoran(testInput);

      const transactions = await db.select()
        .from(transaksiSetoranTable)
        .where(eq(transaksiSetoranTable.id, result.id))
        .execute();

      expect(transactions).toHaveLength(1);
      expect(transactions[0].nasabah_id).toEqual(nasabahId);
      expect(parseFloat(transactions[0].berat)).toEqual(2.5);
      expect(parseFloat(transactions[0].total_setoran)).toEqual(12500);
    });

    it('should throw error for non-existent nasabah', async () => {
      testInput.nasabah_id = 99999;
      testInput.jenis_sampah_id = jenisSampahId;

      await expect(createTransaksiSetoran(testInput)).rejects.toThrow(/nasabah not found/i);
    });

    it('should throw error for non-existent jenis sampah', async () => {
      testInput.nasabah_id = nasabahId;
      testInput.jenis_sampah_id = 99999;

      await expect(createTransaksiSetoran(testInput)).rejects.toThrow(/jenis sampah not found/i);
    });
  });

  describe('createTransaksiTarikSaldo', () => {
    const testInput: CreateTransaksiTarikSaldoInput = {
      nasabah_id: 0, // Will be set dynamically
      jumlah_penarikan: 25000
    };

    it('should create a withdrawal transaction', async () => {
      testInput.nasabah_id = nasabahId;

      const result = await createTransaksiTarikSaldo(testInput);

      expect(result.nasabah_id).toEqual(nasabahId);
      expect(result.jumlah_penarikan).toEqual(25000);
      expect(result.id).toBeDefined();
      expect(result.tanggal).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should update nasabah saldo correctly', async () => {
      testInput.nasabah_id = nasabahId;

      await createTransaksiTarikSaldo(testInput);

      const updatedNasabah = await db.select()
        .from(nasabahTable)
        .where(eq(nasabahTable.id, nasabahId))
        .execute();

      expect(parseFloat(updatedNasabah[0].saldo)).toEqual(25000); // 50000 - 25000
    });

    it('should throw error for insufficient balance', async () => {
      testInput.nasabah_id = nasabahId;
      testInput.jumlah_penarikan = 75000; // More than available balance

      await expect(createTransaksiTarikSaldo(testInput)).rejects.toThrow(/insufficient balance/i);
    });

    it('should throw error for non-existent nasabah', async () => {
      testInput.nasabah_id = 99999;
      testInput.jumlah_penarikan = 25000;

      await expect(createTransaksiTarikSaldo(testInput)).rejects.toThrow(/nasabah not found/i);
    });
  });

  describe('createTransaksiPenjualan', () => {
    const testInput: CreateTransaksiPenjualanInput = {
      pengepul_id: 0, // Will be set dynamically
      jenis_sampah_id: 0, // Will be set dynamically
      berat: 1.5
    };

    it('should create a sales transaction when stock is available', async () => {
      // First create some stock via deposit
      await createTransaksiSetoran({
        nasabah_id: nasabahId,
        jenis_sampah_id: jenisSampahId,
        berat: 3.0
      });

      testInput.pengepul_id = pengepulId;
      testInput.jenis_sampah_id = jenisSampahId;

      const result = await createTransaksiPenjualan(testInput);

      expect(result.pengepul_id).toEqual(pengepulId);
      expect(result.jenis_sampah_id).toEqual(jenisSampahId);
      expect(result.berat).toEqual(1.5);
      expect(result.harga_per_kg).toEqual(6000);
      expect(result.total_penjualan).toEqual(9000); // 1.5 * 6000
      expect(result.id).toBeDefined();
      expect(result.tanggal).toBeInstanceOf(Date);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for insufficient stock', async () => {
      testInput.pengepul_id = pengepulId;
      testInput.jenis_sampah_id = jenisSampahId;

      await expect(createTransaksiPenjualan(testInput)).rejects.toThrow(/insufficient stock available/i);
    });

    it('should throw error for non-existent pengepul', async () => {
      testInput.pengepul_id = 99999;
      testInput.jenis_sampah_id = jenisSampahId;

      await expect(createTransaksiPenjualan(testInput)).rejects.toThrow(/pengepul not found/i);
    });

    it('should throw error for non-existent jenis sampah', async () => {
      testInput.pengepul_id = pengepulId;
      testInput.jenis_sampah_id = 99999;

      await expect(createTransaksiPenjualan(testInput)).rejects.toThrow(/jenis sampah not found/i);
    });

    it('should calculate available stock correctly', async () => {
      // Create deposits
      await createTransaksiSetoran({
        nasabah_id: nasabahId,
        jenis_sampah_id: jenisSampahId,
        berat: 5.0
      });

      await createTransaksiSetoran({
        nasabah_id: nasabahId,
        jenis_sampah_id: jenisSampahId,
        berat: 3.0
      });

      // First sale should succeed (total stock: 8.0, selling: 4.0)
      testInput.pengepul_id = pengepulId;
      testInput.jenis_sampah_id = jenisSampahId;
      testInput.berat = 4.0;

      await createTransaksiPenjualan(testInput);

      // Second sale should succeed (remaining stock: 4.0, selling: 3.0)
      testInput.berat = 3.0;
      await createTransaksiPenjualan(testInput);

      // Third sale should fail (remaining stock: 1.0, trying to sell: 2.0)
      testInput.berat = 2.0;
      await expect(createTransaksiPenjualan(testInput)).rejects.toThrow(/insufficient stock available/i);
    });
  });

  describe('getTransaksiSetoran', () => {
    it('should fetch all deposit transactions', async () => {
      await createTransaksiSetoran({
        nasabah_id: nasabahId,
        jenis_sampah_id: jenisSampahId,
        berat: 2.0
      });

      await createTransaksiSetoran({
        nasabah_id: nasabahId,
        jenis_sampah_id: jenisSampahId,
        berat: 1.5
      });

      const results = await getTransaksiSetoran();

      expect(results).toHaveLength(2);
      expect(results[0].berat).toEqual(2.0);
      expect(results[1].berat).toEqual(1.5);
      expect(typeof results[0].total_setoran).toBe('number');
      expect(typeof results[0].harga_per_kg).toBe('number');
    });

    it('should return empty array when no transactions exist', async () => {
      const results = await getTransaksiSetoran();
      expect(results).toHaveLength(0);
    });
  });

  describe('getTransaksiTarikSaldo', () => {
    it('should fetch all withdrawal transactions', async () => {
      await createTransaksiTarikSaldo({
        nasabah_id: nasabahId,
        jumlah_penarikan: 20000
      });

      await createTransaksiTarikSaldo({
        nasabah_id: nasabahId,
        jumlah_penarikan: 10000
      });

      const results = await getTransaksiTarikSaldo();

      expect(results).toHaveLength(2);
      expect(results[0].jumlah_penarikan).toEqual(20000);
      expect(results[1].jumlah_penarikan).toEqual(10000);
      expect(typeof results[0].jumlah_penarikan).toBe('number');
    });

    it('should return empty array when no transactions exist', async () => {
      const results = await getTransaksiTarikSaldo();
      expect(results).toHaveLength(0);
    });
  });

  describe('getTransaksiPenjualan', () => {
    it('should fetch all sales transactions', async () => {
      // Create stock first
      await createTransaksiSetoran({
        nasabah_id: nasabahId,
        jenis_sampah_id: jenisSampahId,
        berat: 5.0
      });

      await createTransaksiPenjualan({
        pengepul_id: pengepulId,
        jenis_sampah_id: jenisSampahId,
        berat: 2.0
      });

      await createTransaksiPenjualan({
        pengepul_id: pengepulId,
        jenis_sampah_id: jenisSampahId,
        berat: 1.0
      });

      const results = await getTransaksiPenjualan();

      expect(results).toHaveLength(2);
      expect(results[0].berat).toEqual(2.0);
      expect(results[1].berat).toEqual(1.0);
      expect(typeof results[0].total_penjualan).toBe('number');
      expect(typeof results[0].harga_per_kg).toBe('number');
    });

    it('should return empty array when no transactions exist', async () => {
      const results = await getTransaksiPenjualan();
      expect(results).toHaveLength(0);
    });
  });
});