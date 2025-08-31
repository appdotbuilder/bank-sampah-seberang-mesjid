import { type CreateNasabahInput, type UpdateNasabahInput, type Nasabah } from '../schema';

export const createNasabah = async (input: CreateNasabahInput): Promise<Nasabah> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to create a new nasabah (customer) record.
    // Should validate kode uniqueness and initialize saldo to 0.
    return Promise.resolve({
        id: Math.floor(Math.random() * 1000),
        kode: input.kode,
        nama: input.nama,
        nik_nip: input.nik_nip,
        alamat: input.alamat,
        instansi: input.instansi,
        saldo: 0,
        created_at: new Date()
    } as Nasabah);
};

export const getNasabah = async (): Promise<Nasabah[]> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all nasabah from database.
    // Should include current saldo balance for each nasabah.
    return Promise.resolve([]);
};

export const getNasabahById = async (id: number): Promise<Nasabah | null> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch a specific nasabah by ID.
    // Should return null if nasabah not found.
    return Promise.resolve(null);
};

export const updateNasabah = async (input: UpdateNasabahInput): Promise<Nasabah> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to update nasabah information.
    // Should validate nasabah exists and kode uniqueness if kode is being updated.
    return Promise.resolve({
        id: input.id,
        kode: input.kode || 'NSB001',
        nama: input.nama || 'Updated Name',
        nik_nip: input.nik_nip || '1234567890',
        alamat: input.alamat || 'Updated Address',
        instansi: input.instansi || null,
        saldo: 0,
        created_at: new Date()
    } as Nasabah);
};

export const deleteNasabah = async (id: number): Promise<void> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to delete a nasabah record.
    // Should validate nasabah exists and check if they have any transaction history.
    return Promise.resolve();
};