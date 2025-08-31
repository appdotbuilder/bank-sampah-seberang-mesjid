import { db } from '../db';
import { pengepulTable, transaksiPenjualanTable } from '../db/schema';
import { type CreatePengepulInput, type UpdatePengepulInput, type Pengepul } from '../schema';
import { eq } from 'drizzle-orm';

export const createPengepul = async (input: CreatePengepulInput): Promise<Pengepul> => {
  try {
    // Check if kode already exists
    const existingPengepul = await db.select()
      .from(pengepulTable)
      .where(eq(pengepulTable.kode, input.kode))
      .execute();

    if (existingPengepul.length > 0) {
      throw new Error(`Pengepul with kode '${input.kode}' already exists`);
    }

    // Insert new pengepul record
    const result = await db.insert(pengepulTable)
      .values({
        kode: input.kode,
        nama: input.nama,
        alamat: input.alamat
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Pengepul creation failed:', error);
    throw error;
  }
};

export const getPengepul = async (): Promise<Pengepul[]> => {
  try {
    const result = await db.select()
      .from(pengepulTable)
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch pengepul:', error);
    throw error;
  }
};

export const getPengepulById = async (id: number): Promise<Pengepul | null> => {
  try {
    const result = await db.select()
      .from(pengepulTable)
      .where(eq(pengepulTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch pengepul by ID:', error);
    throw error;
  }
};

export const updatePengepul = async (input: UpdatePengepulInput): Promise<Pengepul> => {
  try {
    // Check if pengepul exists
    const existingPengepul = await getPengepulById(input.id);
    if (!existingPengepul) {
      throw new Error(`Pengepul with ID ${input.id} not found`);
    }

    // Check for kode uniqueness if kode is being updated
    if (input.kode && input.kode !== existingPengepul.kode) {
      const duplicatePengepul = await db.select()
        .from(pengepulTable)
        .where(eq(pengepulTable.kode, input.kode))
        .execute();

      if (duplicatePengepul.length > 0) {
        throw new Error(`Pengepul with kode '${input.kode}' already exists`);
      }
    }

    // Prepare update values
    const updateValues: any = {};
    if (input.kode !== undefined) updateValues.kode = input.kode;
    if (input.nama !== undefined) updateValues.nama = input.nama;
    if (input.alamat !== undefined) updateValues.alamat = input.alamat;

    // Update pengepul record
    const result = await db.update(pengepulTable)
      .set(updateValues)
      .where(eq(pengepulTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Pengepul update failed:', error);
    throw error;
  }
};

export const deletePengepul = async (id: number): Promise<void> => {
  try {
    // Check if pengepul exists
    const existingPengepul = await getPengepulById(id);
    if (!existingPengepul) {
      throw new Error(`Pengepul with ID ${id} not found`);
    }

    // Check if pengepul has any transaction history
    const transactions = await db.select()
      .from(transaksiPenjualanTable)
      .where(eq(transaksiPenjualanTable.pengepul_id, id))
      .execute();

    if (transactions.length > 0) {
      throw new Error(`Cannot delete pengepul with ID ${id} because they have transaction history`);
    }

    // Delete pengepul record
    await db.delete(pengepulTable)
      .where(eq(pengepulTable.id, id))
      .execute();
  } catch (error) {
    console.error('Pengepul deletion failed:', error);
    throw error;
  }
};