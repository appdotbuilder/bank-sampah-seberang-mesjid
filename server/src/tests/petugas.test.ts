import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { petugasTable } from '../db/schema';
import { type CreatePetugasInput } from '../schema';
import { createPetugas } from '../handlers/petugas';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreatePetugasInput = {
  kode: 'PTG001',
  nama: 'John Doe',
  nik_nip: '1234567890123456',
  alamat: 'Jl. Test No. 123',
  instansi: 'Bank Sampah Mandiri'
};

// Test input with nullable instansi
const testInputNullInstansi: CreatePetugasInput = {
  kode: 'PTG002',
  nama: 'Jane Smith',
  nik_nip: '9876543210987654',
  alamat: 'Jl. Example No. 456',
  instansi: null
};

describe('createPetugas', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a petugas with all fields', async () => {
    const result = await createPetugas(testInput);

    // Basic field validation
    expect(result.kode).toEqual('PTG001');
    expect(result.nama).toEqual('John Doe');
    expect(result.nik_nip).toEqual('1234567890123456');
    expect(result.alamat).toEqual('Jl. Test No. 123');
    expect(result.instansi).toEqual('Bank Sampah Mandiri');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a petugas with null instansi', async () => {
    const result = await createPetugas(testInputNullInstansi);

    expect(result.kode).toEqual('PTG002');
    expect(result.nama).toEqual('Jane Smith');
    expect(result.nik_nip).toEqual('9876543210987654');
    expect(result.alamat).toEqual('Jl. Example No. 456');
    expect(result.instansi).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save petugas to database', async () => {
    const result = await createPetugas(testInput);

    // Query using proper drizzle syntax
    const petugas = await db.select()
      .from(petugasTable)
      .where(eq(petugasTable.id, result.id))
      .execute();

    expect(petugas).toHaveLength(1);
    expect(petugas[0].kode).toEqual('PTG001');
    expect(petugas[0].nama).toEqual('John Doe');
    expect(petugas[0].nik_nip).toEqual('1234567890123456');
    expect(petugas[0].alamat).toEqual('Jl. Test No. 123');
    expect(petugas[0].instansi).toEqual('Bank Sampah Mandiri');
    expect(petugas[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error on duplicate kode', async () => {
    // Create first petugas
    await createPetugas(testInput);

    // Try to create second petugas with same kode
    const duplicateInput: CreatePetugasInput = {
      ...testInput,
      nama: 'Different Name'
    };

    await expect(createPetugas(duplicateInput))
      .rejects.toThrow(/unique constraint|duplicate key/i);
  });

  it('should create multiple petugas with different kode', async () => {
    const result1 = await createPetugas(testInput);
    const result2 = await createPetugas(testInputNullInstansi);

    expect(result1.kode).toEqual('PTG001');
    expect(result2.kode).toEqual('PTG002');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both are in database
    const allPetugas = await db.select()
      .from(petugasTable)
      .execute();

    expect(allPetugas).toHaveLength(2);
  });

  it('should handle database constraints properly', async () => {
    // Test with valid data
    const result = await createPetugas(testInput);
    expect(result.id).toBeDefined();

    // Verify the unique constraint on kode works
    const sameKodeInput: CreatePetugasInput = {
      kode: 'PTG001', // Same kode
      nama: 'Another Person',
      nik_nip: '9999999999999999',
      alamat: 'Different Address',
      instansi: null
    };

    await expect(createPetugas(sameKodeInput))
      .rejects.toThrow(/unique constraint|duplicate key/i);
  });
});