import { db } from '../db';
import { jenisSampahTable, transaksiSetoranTable, transaksiPenjualanTable } from '../db/schema';
import { type CreateJenisSampahInput, type UpdateJenisSampahInput, type JenisSampah } from '../schema';
import { eq, or } from 'drizzle-orm';

export const createJenisSampah = async (input: CreateJenisSampahInput): Promise<JenisSampah> => {
  try {
    // Validate that harga_jual > harga_beli
    if (input.harga_jual <= input.harga_beli) {
      throw new Error('Harga jual must be greater than harga beli');
    }

    // Check if kode already exists
    const existingJenis = await db.select()
      .from(jenisSampahTable)
      .where(eq(jenisSampahTable.kode, input.kode))
      .execute();

    if (existingJenis.length > 0) {
      throw new Error('Kode jenis sampah already exists');
    }

    // Insert new jenis sampah record
    const result = await db.insert(jenisSampahTable)
      .values({
        kode: input.kode,
        jenis_sampah: input.jenis_sampah,
        harga_beli: input.harga_beli.toString(),
        harga_jual: input.harga_jual.toString()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const jenisSampah = result[0];
    return {
      ...jenisSampah,
      harga_beli: parseFloat(jenisSampah.harga_beli),
      harga_jual: parseFloat(jenisSampah.harga_jual)
    };
  } catch (error) {
    console.error('Jenis sampah creation failed:', error);
    throw error;
  }
};

export const getJenisSampah = async (): Promise<JenisSampah[]> => {
  try {
    const results = await db.select()
      .from(jenisSampahTable)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(jenis => ({
      ...jenis,
      harga_beli: parseFloat(jenis.harga_beli),
      harga_jual: parseFloat(jenis.harga_jual)
    }));
  } catch (error) {
    console.error('Fetch jenis sampah failed:', error);
    throw error;
  }
};

export const getJenisSampahById = async (id: number): Promise<JenisSampah | null> => {
  try {
    const results = await db.select()
      .from(jenisSampahTable)
      .where(eq(jenisSampahTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers
    const jenisSampah = results[0];
    return {
      ...jenisSampah,
      harga_beli: parseFloat(jenisSampah.harga_beli),
      harga_jual: parseFloat(jenisSampah.harga_jual)
    };
  } catch (error) {
    console.error('Fetch jenis sampah by ID failed:', error);
    throw error;
  }
};

export const updateJenisSampah = async (input: UpdateJenisSampahInput): Promise<JenisSampah> => {
  try {
    // Check if jenis sampah exists
    const existing = await getJenisSampahById(input.id);
    if (!existing) {
      throw new Error('Jenis sampah not found');
    }

    // Validate harga_jual > harga_beli if both are provided
    const newHargaBeli = input.harga_beli ?? existing.harga_beli;
    const newHargaJual = input.harga_jual ?? existing.harga_jual;
    
    if (newHargaJual <= newHargaBeli) {
      throw new Error('Harga jual must be greater than harga beli');
    }

    // Check kode uniqueness if kode is being updated
    if (input.kode && input.kode !== existing.kode) {
      const existingKode = await db.select()
        .from(jenisSampahTable)
        .where(eq(jenisSampahTable.kode, input.kode))
        .execute();

      if (existingKode.length > 0) {
        throw new Error('Kode jenis sampah already exists');
      }
    }

    // Prepare update values
    const updateValues: any = {};
    if (input.kode !== undefined) updateValues.kode = input.kode;
    if (input.jenis_sampah !== undefined) updateValues.jenis_sampah = input.jenis_sampah;
    if (input.harga_beli !== undefined) updateValues.harga_beli = input.harga_beli.toString();
    if (input.harga_jual !== undefined) updateValues.harga_jual = input.harga_jual.toString();

    // Update the record
    const result = await db.update(jenisSampahTable)
      .set(updateValues)
      .where(eq(jenisSampahTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers
    const jenisSampah = result[0];
    return {
      ...jenisSampah,
      harga_beli: parseFloat(jenisSampah.harga_beli),
      harga_jual: parseFloat(jenisSampah.harga_jual)
    };
  } catch (error) {
    console.error('Jenis sampah update failed:', error);
    throw error;
  }
};

export const deleteJenisSampah = async (id: number): Promise<void> => {
  try {
    // Check if jenis sampah exists
    const existing = await getJenisSampahById(id);
    if (!existing) {
      throw new Error('Jenis sampah not found');
    }

    // Check if jenis sampah is used in any transactions
    const usedInTransactions = await db.select()
      .from(transaksiSetoranTable)
      .where(eq(transaksiSetoranTable.jenis_sampah_id, id))
      .execute();

    if (usedInTransactions.length > 0) {
      throw new Error('Cannot delete jenis sampah that is used in transactions');
    }

    const usedInSales = await db.select()
      .from(transaksiPenjualanTable)
      .where(eq(transaksiPenjualanTable.jenis_sampah_id, id))
      .execute();

    if (usedInSales.length > 0) {
      throw new Error('Cannot delete jenis sampah that is used in transactions');
    }

    // Delete the record
    await db.delete(jenisSampahTable)
      .where(eq(jenisSampahTable.id, id))
      .execute();
  } catch (error) {
    console.error('Jenis sampah deletion failed:', error);
    throw error;
  }
};