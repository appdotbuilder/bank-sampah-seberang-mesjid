import { db } from '../db';
import { 
  nasabahTable, 
  petugasTable, 
  jenisSampahTable, 
  transaksiSetoranTable, 
  transaksiTarikSaldoTable, 
  transaksiPenjualanTable 
} from '../db/schema';
import { type DashboardStats, type StokSampah } from '../schema';
import { count, sum, sql } from 'drizzle-orm';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Get total counts
    const [
      totalNasabahResult,
      totalPetugasResult, 
      totalJenisSampahResult,
      totalTransaksiSetoranResult,
      totalSaldoNasabahResult,
      jumlahPermintaanTarikSaldoResult,
      totalSampahTerkirimResult
    ] = await Promise.all([
      // Count total nasabah
      db.select({ count: count() }).from(nasabahTable),
      
      // Count total petugas
      db.select({ count: count() }).from(petugasTable),
      
      // Count total jenis sampah
      db.select({ count: count() }).from(jenisSampahTable),
      
      // Count total transaksi setoran
      db.select({ count: count() }).from(transaksiSetoranTable),
      
      // Sum total saldo nasabah
      db.select({ total: sum(nasabahTable.saldo) }).from(nasabahTable),
      
      // Count total permintaan tarik saldo
      db.select({ count: count() }).from(transaksiTarikSaldoTable),
      
      // Sum total sampah terkirim (total berat from penjualan)
      db.select({ total: sum(transaksiPenjualanTable.berat) }).from(transaksiPenjualanTable)
    ]);

    // Calculate total stok sampah and keuntungan
    const [totalStokResult, keuntunganResult] = await Promise.all([
      // Calculate total stok (setoran - penjualan)
      db.execute(sql`
        SELECT COALESCE(SUM(stok_tersisa), 0) as total_stok
        FROM (
          SELECT 
            COALESCE(setoran.total_berat, 0) - COALESCE(penjualan.total_berat, 0) as stok_tersisa
          FROM ${jenisSampahTable}
          LEFT JOIN (
            SELECT jenis_sampah_id, SUM(berat) as total_berat 
            FROM ${transaksiSetoranTable} 
            GROUP BY jenis_sampah_id
          ) setoran ON ${jenisSampahTable.id} = setoran.jenis_sampah_id
          LEFT JOIN (
            SELECT jenis_sampah_id, SUM(berat) as total_berat 
            FROM ${transaksiPenjualanTable} 
            GROUP BY jenis_sampah_id
          ) penjualan ON ${jenisSampahTable.id} = penjualan.jenis_sampah_id
        ) stok_calc
      `),
      
      // Calculate keuntungan (penjualan total - setoran total)
      db.execute(sql`
        SELECT 
          COALESCE(penjualan_total.total, 0) - COALESCE(setoran_total.total, 0) as keuntungan
        FROM (
          SELECT SUM(total_penjualan) as total 
          FROM ${transaksiPenjualanTable}
        ) penjualan_total
        CROSS JOIN (
          SELECT SUM(total_setoran) as total 
          FROM ${transaksiSetoranTable}
        ) setoran_total
      `)
    ]);

    const totalStokRows = totalStokResult.rows as any[];
    const keuntunganRows = keuntunganResult.rows as any[];

    return {
      total_nasabah: totalNasabahResult[0].count,
      total_petugas: totalPetugasResult[0].count,
      total_jenis_sampah: totalJenisSampahResult[0].count,
      total_transaksi_setoran: totalTransaksiSetoranResult[0].count,
      total_saldo_nasabah: parseFloat(totalSaldoNasabahResult[0].total || '0'),
      jumlah_permintaan_tarik_saldo: jumlahPermintaanTarikSaldoResult[0].count,
      total_stok_sampah: parseFloat(totalStokRows[0]?.total_stok || '0'),
      total_sampah_terkirim: parseFloat(totalSampahTerkirimResult[0].total || '0'),
      keuntungan: parseFloat(keuntunganRows[0]?.keuntungan || '0')
    };
  } catch (error) {
    console.error('Dashboard stats calculation failed:', error);
    throw error;
  }
};

export const getStokSampah = async (): Promise<StokSampah[]> => {
  try {
    const result = await db.execute(sql`
      SELECT 
        js.id as jenis_sampah_id,
        js.jenis_sampah,
        COALESCE(setoran.total_berat, 0) as total_setoran,
        COALESCE(penjualan.total_berat, 0) as total_terjual,
        COALESCE(setoran.total_berat, 0) - COALESCE(penjualan.total_berat, 0) as stok_tersisa
      FROM ${jenisSampahTable} js
      LEFT JOIN (
        SELECT jenis_sampah_id, SUM(berat) as total_berat 
        FROM ${transaksiSetoranTable} 
        GROUP BY jenis_sampah_id
      ) setoran ON js.id = setoran.jenis_sampah_id
      LEFT JOIN (
        SELECT jenis_sampah_id, SUM(berat) as total_berat 
        FROM ${transaksiPenjualanTable} 
        GROUP BY jenis_sampah_id
      ) penjualan ON js.id = penjualan.jenis_sampah_id
      ORDER BY js.jenis_sampah
    `);

    const rows = result.rows as any[];
    return rows.map((row: any) => ({
      jenis_sampah_id: row.jenis_sampah_id,
      jenis_sampah: row.jenis_sampah,
      total_setoran: parseFloat(row.total_setoran || '0'),
      total_terjual: parseFloat(row.total_terjual || '0'),
      stok_tersisa: parseFloat(row.stok_tersisa || '0')
    }));
  } catch (error) {
    console.error('Stok sampah calculation failed:', error);
    throw error;
  }
};