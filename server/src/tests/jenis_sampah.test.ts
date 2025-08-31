import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { jenisSampahTable, nasabahTable, transaksiSetoranTable } from '../db/schema';
import { type CreateJenisSampahInput, type UpdateJenisSampahInput } from '../schema';
import { 
  createJenisSampah, 
  getJenisSampah, 
  getJenisSampahById, 
  updateJenisSampah, 
  deleteJenisSampah 
} from '../handlers/jenis_sampah';
import { eq } from 'drizzle-orm';

// Test input data
const testInput: CreateJenisSampahInput = {
  kode: 'JS001',
  jenis_sampah: 'Plastik Botol',
  harga_beli: 2000,
  harga_jual: 2500
};

const testInput2: CreateJenisSampahInput = {
  kode: 'JS002',
  jenis_sampah: 'Kertas',
  harga_beli: 1500,
  harga_jual: 2000
};

describe('createJenisSampah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a jenis sampah', async () => {
    const result = await createJenisSampah(testInput);

    expect(result.kode).toEqual('JS001');
    expect(result.jenis_sampah).toEqual('Plastik Botol');
    expect(result.harga_beli).toEqual(2000);
    expect(result.harga_jual).toEqual(2500);
    expect(typeof result.harga_beli).toEqual('number');
    expect(typeof result.harga_jual).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save jenis sampah to database', async () => {
    const result = await createJenisSampah(testInput);

    const saved = await db.select()
      .from(jenisSampahTable)
      .where(eq(jenisSampahTable.id, result.id))
      .execute();

    expect(saved).toHaveLength(1);
    expect(saved[0].kode).toEqual('JS001');
    expect(saved[0].jenis_sampah).toEqual('Plastik Botol');
    expect(parseFloat(saved[0].harga_beli)).toEqual(2000);
    expect(parseFloat(saved[0].harga_jual)).toEqual(2500);
  });

  it('should reject duplicate kode', async () => {
    await createJenisSampah(testInput);
    
    expect(createJenisSampah(testInput)).rejects.toThrow(/already exists/i);
  });

  it('should reject when harga_jual <= harga_beli', async () => {
    const invalidInput = {
      ...testInput,
      harga_beli: 3000,
      harga_jual: 2500
    };

    expect(createJenisSampah(invalidInput)).rejects.toThrow(/greater than/i);
  });

  it('should reject when harga_jual equals harga_beli', async () => {
    const invalidInput = {
      ...testInput,
      harga_beli: 2500,
      harga_jual: 2500
    };

    expect(createJenisSampah(invalidInput)).rejects.toThrow(/greater than/i);
  });
});

describe('getJenisSampah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no jenis sampah exist', async () => {
    const result = await getJenisSampah();
    expect(result).toEqual([]);
  });

  it('should return all jenis sampah', async () => {
    await createJenisSampah(testInput);
    await createJenisSampah(testInput2);

    const result = await getJenisSampah();

    expect(result).toHaveLength(2);
    expect(result[0].kode).toEqual('JS001');
    expect(result[1].kode).toEqual('JS002');
    expect(typeof result[0].harga_beli).toEqual('number');
    expect(typeof result[0].harga_jual).toEqual('number');
  });
});

describe('getJenisSampahById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent id', async () => {
    const result = await getJenisSampahById(999);
    expect(result).toBeNull();
  });

  it('should return jenis sampah by id', async () => {
    const created = await createJenisSampah(testInput);
    const result = await getJenisSampahById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.kode).toEqual('JS001');
    expect(result!.jenis_sampah).toEqual('Plastik Botol');
    expect(typeof result!.harga_beli).toEqual('number');
    expect(typeof result!.harga_jual).toEqual('number');
  });
});

describe('updateJenisSampah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update jenis sampah fields', async () => {
    const created = await createJenisSampah(testInput);

    const updateInput: UpdateJenisSampahInput = {
      id: created.id,
      kode: 'JS001-UPDATED',
      jenis_sampah: 'Plastik Botol Updated',
      harga_beli: 2200,
      harga_jual: 2800
    };

    const result = await updateJenisSampah(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.kode).toEqual('JS001-UPDATED');
    expect(result.jenis_sampah).toEqual('Plastik Botol Updated');
    expect(result.harga_beli).toEqual(2200);
    expect(result.harga_jual).toEqual(2800);
    expect(typeof result.harga_beli).toEqual('number');
    expect(typeof result.harga_jual).toEqual('number');
  });

  it('should update partial fields', async () => {
    const created = await createJenisSampah(testInput);

    const updateInput: UpdateJenisSampahInput = {
      id: created.id,
      jenis_sampah: 'Updated Name Only'
    };

    const result = await updateJenisSampah(updateInput);

    expect(result.kode).toEqual('JS001'); // unchanged
    expect(result.jenis_sampah).toEqual('Updated Name Only');
    expect(result.harga_beli).toEqual(2000); // unchanged
    expect(result.harga_jual).toEqual(2500); // unchanged
  });

  it('should reject non-existent id', async () => {
    const updateInput: UpdateJenisSampahInput = {
      id: 999,
      jenis_sampah: 'Test'
    };

    expect(updateJenisSampah(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should reject duplicate kode', async () => {
    const created1 = await createJenisSampah(testInput);
    await createJenisSampah(testInput2);

    const updateInput: UpdateJenisSampahInput = {
      id: created1.id,
      kode: 'JS002' // Trying to use existing kode
    };

    expect(updateJenisSampah(updateInput)).rejects.toThrow(/already exists/i);
  });

  it('should reject when updated harga_jual <= harga_beli', async () => {
    const created = await createJenisSampah(testInput);

    const updateInput: UpdateJenisSampahInput = {
      id: created.id,
      harga_jual: 1500 // Less than existing harga_beli (2000)
    };

    expect(updateJenisSampah(updateInput)).rejects.toThrow(/greater than/i);
  });

  it('should allow same kode for same record', async () => {
    const created = await createJenisSampah(testInput);

    const updateInput: UpdateJenisSampahInput = {
      id: created.id,
      kode: 'JS001', // Same as existing kode for this record
      jenis_sampah: 'Updated Name'
    };

    const result = await updateJenisSampah(updateInput);
    expect(result.kode).toEqual('JS001');
    expect(result.jenis_sampah).toEqual('Updated Name');
  });
});

describe('deleteJenisSampah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete jenis sampah', async () => {
    const created = await createJenisSampah(testInput);

    await deleteJenisSampah(created.id);

    const result = await getJenisSampahById(created.id);
    expect(result).toBeNull();
  });

  it('should reject non-existent id', async () => {
    expect(deleteJenisSampah(999)).rejects.toThrow(/not found/i);
  });

  it('should reject deletion when used in transaksi setoran', async () => {
    const created = await createJenisSampah(testInput);

    // Create nasabah first (required for transaction)
    const nasabah = await db.insert(nasabahTable)
      .values({
        kode: 'N001',
        nama: 'Test Nasabah',
        nik_nip: '123456789',
        alamat: 'Test Address'
      })
      .returning()
      .execute();

    // Create transaction that uses this jenis sampah
    await db.insert(transaksiSetoranTable)
      .values({
        nasabah_id: nasabah[0].id,
        jenis_sampah_id: created.id,
        berat: '5.0',
        harga_per_kg: '2000',
        total_setoran: '10000'
      })
      .execute();

    expect(deleteJenisSampah(created.id)).rejects.toThrow(/used in transactions/i);
  });
});