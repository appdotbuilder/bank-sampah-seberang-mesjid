import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  nasabahTable, 
  petugasTable, 
  jenisSampahTable, 
  pengepulTable,
  transaksiSetoranTable, 
  transaksiTarikSaldoTable, 
  transaksiPenjualanTable 
} from '../db/schema';
import { getDashboardStats, getStokSampah } from '../handlers/dashboard';

describe('Dashboard Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getDashboardStats', () => {
    it('should return zero stats for empty database', async () => {
      const stats = await getDashboardStats();

      expect(stats.total_nasabah).toEqual(0);
      expect(stats.total_petugas).toEqual(0);
      expect(stats.total_jenis_sampah).toEqual(0);
      expect(stats.total_transaksi_setoran).toEqual(0);
      expect(stats.total_saldo_nasabah).toEqual(0);
      expect(stats.jumlah_permintaan_tarik_saldo).toEqual(0);
      expect(stats.total_stok_sampah).toEqual(0);
      expect(stats.total_sampah_terkirim).toEqual(0);
      expect(stats.keuntungan).toEqual(0);
    });

    it('should calculate correct stats with sample data', async () => {
      // Create sample data
      const nasabah = await db.insert(nasabahTable).values([
        {
          kode: 'N001',
          nama: 'John Doe',
          nik_nip: '1234567890',
          alamat: 'Jakarta',
          instansi: 'PT ABC',
          saldo: '50000.00'
        },
        {
          kode: 'N002', 
          nama: 'Jane Doe',
          nik_nip: '0987654321',
          alamat: 'Bandung',
          instansi: null,
          saldo: '75000.50'
        }
      ]).returning();

      const petugas = await db.insert(petugasTable).values([
        {
          kode: 'P001',
          nama: 'Officer One',
          nik_nip: '1111111111',
          alamat: 'Jakarta',
          instansi: 'Dinas Lingkungan'
        }
      ]).returning();

      const jenisSampah = await db.insert(jenisSampahTable).values([
        {
          kode: 'JS001',
          jenis_sampah: 'Plastik',
          harga_beli: '2000.00',
          harga_jual: '2500.00'
        },
        {
          kode: 'JS002',
          jenis_sampah: 'Kertas',
          harga_beli: '1500.00',
          harga_jual: '2000.00'
        }
      ]).returning();

      const pengepul = await db.insert(pengepulTable).values([
        {
          kode: 'PG001',
          nama: 'Pengepul ABC',
          alamat: 'Jakarta'
        }
      ]).returning();

      // Create transaksi setoran
      await db.insert(transaksiSetoranTable).values([
        {
          nasabah_id: nasabah[0].id,
          jenis_sampah_id: jenisSampah[0].id,
          berat: '10.500',
          harga_per_kg: '2000.00',
          total_setoran: '21000.00'
        },
        {
          nasabah_id: nasabah[1].id,
          jenis_sampah_id: jenisSampah[1].id,
          berat: '5.250',
          harga_per_kg: '1500.00',
          total_setoran: '7875.00'
        }
      ]);

      // Create transaksi tarik saldo
      await db.insert(transaksiTarikSaldoTable).values([
        {
          nasabah_id: nasabah[0].id,
          jumlah_penarikan: '20000.00'
        },
        {
          nasabah_id: nasabah[1].id,
          jumlah_penarikan: '15000.00'
        }
      ]);

      // Create transaksi penjualan
      await db.insert(transaksiPenjualanTable).values([
        {
          pengepul_id: pengepul[0].id,
          jenis_sampah_id: jenisSampah[0].id,
          berat: '8.000',
          harga_per_kg: '2500.00',
          total_penjualan: '20000.00'
        }
      ]);

      const stats = await getDashboardStats();

      expect(stats.total_nasabah).toEqual(2);
      expect(stats.total_petugas).toEqual(1);
      expect(stats.total_jenis_sampah).toEqual(2);
      expect(stats.total_transaksi_setoran).toEqual(2);
      expect(stats.total_saldo_nasabah).toEqual(125000.5); // 50000 + 75000.5
      expect(stats.jumlah_permintaan_tarik_saldo).toEqual(2);
      expect(stats.total_stok_sampah).toEqual(7.75); // (10.5 + 5.25) - 8.0
      expect(stats.total_sampah_terkirim).toEqual(8.0);
      expect(stats.keuntungan).toEqual(-8875.0); // 20000 - 28875
    });

    it('should handle numeric conversions correctly', async () => {
      // Create sample data with specific numeric values
      await db.insert(nasabahTable).values([
        {
          kode: 'N001',
          nama: 'Test User',
          nik_nip: '1234567890',
          alamat: 'Test Address',
          instansi: null,
          saldo: '123.45'
        }
      ]);

      const stats = await getDashboardStats();

      expect(typeof stats.total_saldo_nasabah).toBe('number');
      expect(stats.total_saldo_nasabah).toEqual(123.45);
      expect(typeof stats.total_stok_sampah).toBe('number');
      expect(typeof stats.total_sampah_terkirim).toBe('number');
      expect(typeof stats.keuntungan).toBe('number');
    });
  });

  describe('getStokSampah', () => {
    it('should return empty array for no jenis sampah', async () => {
      const stok = await getStokSampah();
      expect(stok).toEqual([]);
    });

    it('should calculate stock levels correctly', async () => {
      // Create sample data
      const nasabah = await db.insert(nasabahTable).values([
        {
          kode: 'N001',
          nama: 'Test User',
          nik_nip: '1234567890',
          alamat: 'Test Address',
          instansi: null
        }
      ]).returning();

      const jenisSampah = await db.insert(jenisSampahTable).values([
        {
          kode: 'JS001',
          jenis_sampah: 'Plastik',
          harga_beli: '2000.00',
          harga_jual: '2500.00'
        },
        {
          kode: 'JS002',
          jenis_sampah: 'Kertas',
          harga_beli: '1500.00',
          harga_jual: '2000.00'
        }
      ]).returning();

      const pengepul = await db.insert(pengepulTable).values([
        {
          kode: 'PG001',
          nama: 'Test Pengepul',
          alamat: 'Test Address'
        }
      ]).returning();

      // Create setoran transactions
      await db.insert(transaksiSetoranTable).values([
        {
          nasabah_id: nasabah[0].id,
          jenis_sampah_id: jenisSampah[0].id, // Plastik
          berat: '15.500',
          harga_per_kg: '2000.00',
          total_setoran: '31000.00'
        },
        {
          nasabah_id: nasabah[0].id,
          jenis_sampah_id: jenisSampah[0].id, // Plastik
          berat: '10.250',
          harga_per_kg: '2000.00',
          total_setoran: '20500.00'
        },
        {
          nasabah_id: nasabah[0].id,
          jenis_sampah_id: jenisSampah[1].id, // Kertas
          berat: '8.000',
          harga_per_kg: '1500.00',
          total_setoran: '12000.00'
        }
      ]);

      // Create penjualan transaction
      await db.insert(transaksiPenjualanTable).values([
        {
          pengepul_id: pengepul[0].id,
          jenis_sampah_id: jenisSampah[0].id, // Plastik
          berat: '20.000',
          harga_per_kg: '2500.00',
          total_penjualan: '50000.00'
        }
      ]);

      const stok = await getStokSampah();

      expect(stok).toHaveLength(2);
      
      // Sort by jenis_sampah for consistent testing
      const sortedStok = stok.sort((a, b) => a.jenis_sampah.localeCompare(b.jenis_sampah));

      // Kertas (no sales, only deposits)
      expect(sortedStok[0].jenis_sampah).toEqual('Kertas');
      expect(sortedStok[0].total_setoran).toEqual(8.0);
      expect(sortedStok[0].total_terjual).toEqual(0);
      expect(sortedStok[0].stok_tersisa).toEqual(8.0);

      // Plastik (deposits - sales)
      expect(sortedStok[1].jenis_sampah).toEqual('Plastik');
      expect(sortedStok[1].total_setoran).toEqual(25.75); // 15.5 + 10.25
      expect(sortedStok[1].total_terjual).toEqual(20.0);
      expect(sortedStok[1].stok_tersisa).toEqual(5.75);
    });

    it('should handle numeric conversions correctly', async () => {
      // Create jenis sampah without any transactions
      await db.insert(jenisSampahTable).values([
        {
          kode: 'JS001',
          jenis_sampah: 'Test Sampah',
          harga_beli: '1000.00',
          harga_jual: '1200.00'
        }
      ]);

      const stok = await getStokSampah();

      expect(stok).toHaveLength(1);
      expect(typeof stok[0].total_setoran).toBe('number');
      expect(typeof stok[0].total_terjual).toBe('number');
      expect(typeof stok[0].stok_tersisa).toBe('number');
      expect(stok[0].total_setoran).toEqual(0);
      expect(stok[0].total_terjual).toEqual(0);
      expect(stok[0].stok_tersisa).toEqual(0);
    });

    it('should return results ordered by jenis_sampah', async () => {
      // Create multiple jenis sampah in random order
      await db.insert(jenisSampahTable).values([
        {
          kode: 'JS003',
          jenis_sampah: 'Zebra Sampah',
          harga_beli: '1000.00',
          harga_jual: '1200.00'
        },
        {
          kode: 'JS001',
          jenis_sampah: 'Alpha Sampah',
          harga_beli: '1000.00',
          harga_jual: '1200.00'
        },
        {
          kode: 'JS002',
          jenis_sampah: 'Beta Sampah',
          harga_beli: '1000.00',
          harga_jual: '1200.00'
        }
      ]);

      const stok = await getStokSampah();

      expect(stok).toHaveLength(3);
      expect(stok[0].jenis_sampah).toEqual('Alpha Sampah');
      expect(stok[1].jenis_sampah).toEqual('Beta Sampah');
      expect(stok[2].jenis_sampah).toEqual('Zebra Sampah');
    });
  });
});