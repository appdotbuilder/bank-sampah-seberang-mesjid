import { db } from '../db';
import { nasabahTable, transaksiSetoranTable, transaksiTarikSaldoTable } from '../db/schema';
import { type CreateNasabahInput, type UpdateNasabahInput, type Nasabah } from '../schema';
import { eq, count } from 'drizzle-orm';

export const createNasabah = async (input: CreateNasabahInput): Promise<Nasabah> => {
  try {
    // Insert nasabah record with default saldo of 0
    const result = await db.insert(nasabahTable)
      .values({
        kode: input.kode,
        nama: input.nama,
        nik_nip: input.nik_nip,
        alamat: input.alamat,
        instansi: input.instansi,
        saldo: '0' // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const nasabah = result[0];
    return {
      ...nasabah,
      saldo: parseFloat(nasabah.saldo) // Convert string back to number
    };
  } catch (error) {
    console.error('Nasabah creation failed:', error);
    throw error;
  }
};

export const getNasabah = async (): Promise<Nasabah[]> => {
  try {
    const results = await db.select()
      .from(nasabahTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(nasabah => ({
      ...nasabah,
      saldo: parseFloat(nasabah.saldo) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch nasabah:', error);
    throw error;
  }
};

export const getNasabahById = async (id: number): Promise<Nasabah | null> => {
  try {
    const results = await db.select()
      .from(nasabahTable)
      .where(eq(nasabahTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const nasabah = results[0];
    return {
      ...nasabah,
      saldo: parseFloat(nasabah.saldo) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to fetch nasabah by ID:', error);
    throw error;
  }
};

export const updateNasabah = async (input: UpdateNasabahInput): Promise<Nasabah> => {
  try {
    // First verify that nasabah exists
    const existing = await getNasabahById(input.id);
    if (!existing) {
      throw new Error('Nasabah not found');
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (input.kode !== undefined) updateData.kode = input.kode;
    if (input.nama !== undefined) updateData.nama = input.nama;
    if (input.nik_nip !== undefined) updateData.nik_nip = input.nik_nip;
    if (input.alamat !== undefined) updateData.alamat = input.alamat;
    if (input.instansi !== undefined) updateData.instansi = input.instansi;

    const result = await db.update(nasabahTable)
      .set(updateData)
      .where(eq(nasabahTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const nasabah = result[0];
    return {
      ...nasabah,
      saldo: parseFloat(nasabah.saldo) // Convert string back to number
    };
  } catch (error) {
    console.error('Nasabah update failed:', error);
    throw error;
  }
};

export const deleteNasabah = async (id: number): Promise<void> => {
  try {
    // First verify that nasabah exists
    const existing = await getNasabahById(id);
    if (!existing) {
      throw new Error('Nasabah not found');
    }

    // Check if nasabah has any transaction history
    const [setoranCount, tarikSaldoCount] = await Promise.all([
      db.select({ count: count() })
        .from(transaksiSetoranTable)
        .where(eq(transaksiSetoranTable.nasabah_id, id))
        .execute(),
      db.select({ count: count() })
        .from(transaksiTarikSaldoTable)
        .where(eq(transaksiTarikSaldoTable.nasabah_id, id))
        .execute()
    ]);

    const totalTransactions = setoranCount[0].count + tarikSaldoCount[0].count;
    if (totalTransactions > 0) {
      throw new Error('Cannot delete nasabah with existing transaction history');
    }

    // Delete the nasabah
    await db.delete(nasabahTable)
      .where(eq(nasabahTable.id, id))
      .execute();
  } catch (error) {
    console.error('Nasabah deletion failed:', error);
    throw error;
  }
};