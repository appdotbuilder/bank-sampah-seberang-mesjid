import { db } from '../db';
import { eq, sum, sql } from 'drizzle-orm';
import { 
  nasabahTable,
  jenisSampahTable,
  pengepulTable,
  transaksiSetoranTable,
  transaksiTarikSaldoTable,
  transaksiPenjualanTable
} from '../db/schema';
import { 
  type CreateTransaksiSetoranInput, 
  type CreateTransaksiTarikSaldoInput, 
  type CreateTransaksiPenjualanInput,
  type TransaksiSetoran,
  type TransaksiTarikSaldo,
  type TransaksiPenjualan 
} from '../schema';

export const createTransaksiSetoran = async (input: CreateTransaksiSetoranInput): Promise<TransaksiSetoran> => {
  try {
    // Validate nasabah exists
    const nasabah = await db.select()
      .from(nasabahTable)
      .where(eq(nasabahTable.id, input.nasabah_id))
      .execute();

    if (nasabah.length === 0) {
      throw new Error('Nasabah not found');
    }

    // Validate jenis_sampah exists and get current price
    const jenisSampah = await db.select()
      .from(jenisSampahTable)
      .where(eq(jenisSampahTable.id, input.jenis_sampah_id))
      .execute();

    if (jenisSampah.length === 0) {
      throw new Error('Jenis sampah not found');
    }

    const hargaBeli = parseFloat(jenisSampah[0].harga_beli);
    const totalSetoran = input.berat * hargaBeli;

    // Start transaction - insert deposit record
    const result = await db.insert(transaksiSetoranTable)
      .values({
        nasabah_id: input.nasabah_id,
        jenis_sampah_id: input.jenis_sampah_id,
        berat: input.berat.toString(),
        harga_per_kg: hargaBeli.toString(),
        total_setoran: totalSetoran.toString()
      })
      .returning()
      .execute();

    // Update nasabah saldo
    const currentSaldo = parseFloat(nasabah[0].saldo);
    const newSaldo = currentSaldo + totalSetoran;

    await db.update(nasabahTable)
      .set({ saldo: newSaldo.toString() })
      .where(eq(nasabahTable.id, input.nasabah_id))
      .execute();

    // Convert numeric fields back to numbers
    const transaction = result[0];
    return {
      ...transaction,
      berat: parseFloat(transaction.berat),
      harga_per_kg: parseFloat(transaction.harga_per_kg),
      total_setoran: parseFloat(transaction.total_setoran)
    };
  } catch (error) {
    console.error('Deposit transaction creation failed:', error);
    throw error;
  }
};

export const createTransaksiTarikSaldo = async (input: CreateTransaksiTarikSaldoInput): Promise<TransaksiTarikSaldo> => {
  try {
    // Validate nasabah exists and check saldo
    const nasabah = await db.select()
      .from(nasabahTable)
      .where(eq(nasabahTable.id, input.nasabah_id))
      .execute();

    if (nasabah.length === 0) {
      throw new Error('Nasabah not found');
    }

    const currentSaldo = parseFloat(nasabah[0].saldo);
    if (currentSaldo < input.jumlah_penarikan) {
      throw new Error('Insufficient balance');
    }

    // Insert withdrawal record
    const result = await db.insert(transaksiTarikSaldoTable)
      .values({
        nasabah_id: input.nasabah_id,
        jumlah_penarikan: input.jumlah_penarikan.toString()
      })
      .returning()
      .execute();

    // Update nasabah saldo
    const newSaldo = currentSaldo - input.jumlah_penarikan;
    await db.update(nasabahTable)
      .set({ saldo: newSaldo.toString() })
      .where(eq(nasabahTable.id, input.nasabah_id))
      .execute();

    // Convert numeric fields back to numbers
    const transaction = result[0];
    return {
      ...transaction,
      jumlah_penarikan: parseFloat(transaction.jumlah_penarikan)
    };
  } catch (error) {
    console.error('Withdrawal transaction creation failed:', error);
    throw error;
  }
};

export const createTransaksiPenjualan = async (input: CreateTransaksiPenjualanInput): Promise<TransaksiPenjualan> => {
  try {
    // Validate pengepul exists
    const pengepul = await db.select()
      .from(pengepulTable)
      .where(eq(pengepulTable.id, input.pengepul_id))
      .execute();

    if (pengepul.length === 0) {
      throw new Error('Pengepul not found');
    }

    // Validate jenis_sampah exists and get current price
    const jenisSampah = await db.select()
      .from(jenisSampahTable)
      .where(eq(jenisSampahTable.id, input.jenis_sampah_id))
      .execute();

    if (jenisSampah.length === 0) {
      throw new Error('Jenis sampah not found');
    }

    // Check available stock from deposit transactions
    const stockQuery = await db.select({
      total_setoran: sum(transaksiSetoranTable.berat)
    })
      .from(transaksiSetoranTable)
      .where(eq(transaksiSetoranTable.jenis_sampah_id, input.jenis_sampah_id))
      .execute();

    const soldQuery = await db.select({
      total_terjual: sum(transaksiPenjualanTable.berat)
    })
      .from(transaksiPenjualanTable)
      .where(eq(transaksiPenjualanTable.jenis_sampah_id, input.jenis_sampah_id))
      .execute();

    const totalSetoran = stockQuery[0]?.total_setoran ? parseFloat(stockQuery[0].total_setoran) : 0;
    const totalTerjual = soldQuery[0]?.total_terjual ? parseFloat(soldQuery[0].total_terjual) : 0;
    const availableStock = totalSetoran - totalTerjual;

    if (availableStock < input.berat) {
      throw new Error('Insufficient stock available');
    }

    const hargaJual = parseFloat(jenisSampah[0].harga_jual);
    const totalPenjualan = input.berat * hargaJual;

    // Insert sales record
    const result = await db.insert(transaksiPenjualanTable)
      .values({
        pengepul_id: input.pengepul_id,
        jenis_sampah_id: input.jenis_sampah_id,
        berat: input.berat.toString(),
        harga_per_kg: hargaJual.toString(),
        total_penjualan: totalPenjualan.toString()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const transaction = result[0];
    return {
      ...transaction,
      berat: parseFloat(transaction.berat),
      harga_per_kg: parseFloat(transaction.harga_per_kg),
      total_penjualan: parseFloat(transaction.total_penjualan)
    };
  } catch (error) {
    console.error('Sales transaction creation failed:', error);
    throw error;
  }
};

export const getTransaksiSetoran = async (): Promise<TransaksiSetoran[]> => {
  try {
    const results = await db.select()
      .from(transaksiSetoranTable)
      .execute();

    return results.map(transaction => ({
      ...transaction,
      berat: parseFloat(transaction.berat),
      harga_per_kg: parseFloat(transaction.harga_per_kg),
      total_setoran: parseFloat(transaction.total_setoran)
    }));
  } catch (error) {
    console.error('Failed to fetch deposit transactions:', error);
    throw error;
  }
};

export const getTransaksiTarikSaldo = async (): Promise<TransaksiTarikSaldo[]> => {
  try {
    const results = await db.select()
      .from(transaksiTarikSaldoTable)
      .execute();

    return results.map(transaction => ({
      ...transaction,
      jumlah_penarikan: parseFloat(transaction.jumlah_penarikan)
    }));
  } catch (error) {
    console.error('Failed to fetch withdrawal transactions:', error);
    throw error;
  }
};

export const getTransaksiPenjualan = async (): Promise<TransaksiPenjualan[]> => {
  try {
    const results = await db.select()
      .from(transaksiPenjualanTable)
      .execute();

    return results.map(transaction => ({
      ...transaction,
      berat: parseFloat(transaction.berat),
      harga_per_kg: parseFloat(transaction.harga_per_kg),
      total_penjualan: parseFloat(transaction.total_penjualan)
    }));
  } catch (error) {
    console.error('Failed to fetch sales transactions:', error);
    throw error;
  }
};