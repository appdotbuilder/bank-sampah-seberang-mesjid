import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import {
    nasabahTable,
    pengepulTable,
    jenisSampahTable,
    transaksiSetoranTable,
    transaksiTarikSaldoTable,
    transaksiPenjualanTable
} from '../db/schema';
import {
    getLaporanTransaksi,
    getLaporanPerNasabah,
    getNotaPenyetoran,
    getLaporanTransaksiByDateRange
} from '../handlers/reports';
import { type ReportFilters } from '../schema';
import { eq } from 'drizzle-orm';

describe('Reports Handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    // Test data setup
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

        // Create pengepul
        const pengepulResult = await db.insert(pengepulTable)
            .values({
                kode: 'PGL001',
                nama: 'Test Pengepul',
                alamat: 'Pengepul Address'
            })
            .returning()
            .execute();

        // Create jenis sampah
        const jenisSampahResult = await db.insert(jenisSampahTable)
            .values({
                kode: 'JS001',
                jenis_sampah: 'Plastik Botol',
                harga_beli: '2000.00',
                harga_jual: '2500.00'
            })
            .returning()
            .execute();

        const nasabah = nasabahResult[0];
        const pengepul = pengepulResult[0];
        const jenisSampah = jenisSampahResult[0];

        // Create test transactions with explicit timestamps
        const today = new Date();
        today.setHours(12, 0, 0, 0); // Set specific time for consistency
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(12, 0, 0, 0);
        
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        twoDaysAgo.setHours(12, 0, 0, 0);

        // Create setoran transaction
        const setoranResult = await db.insert(transaksiSetoranTable)
            .values({
                nasabah_id: nasabah.id,
                jenis_sampah_id: jenisSampah.id,
                berat: '5.000',
                harga_per_kg: '2000.00',
                total_setoran: '10000.00',
                tanggal: yesterday
            })
            .returning()
            .execute();

        // Update nasabah saldo after setoran (simulate business logic)
        await db.update(nasabahTable)
            .set({ saldo: '60000.00' }) // 50000 + 10000 from setoran
            .where(eq(nasabahTable.id, nasabah.id))
            .execute();

        // Create tarik saldo transaction
        await db.insert(transaksiTarikSaldoTable)
            .values({
                nasabah_id: nasabah.id,
                jumlah_penarikan: '5000.00',
                tanggal: twoDaysAgo
            })
            .returning()
            .execute();

        // Update nasabah saldo after tarik saldo (simulate business logic)  
        await db.update(nasabahTable)
            .set({ saldo: '55000.00' }) // 60000 - 5000 from withdrawal
            .where(eq(nasabahTable.id, nasabah.id))
            .execute();

        // Create penjualan transaction
        await db.insert(transaksiPenjualanTable)
            .values({
                pengepul_id: pengepul.id,
                jenis_sampah_id: jenisSampah.id,
                berat: '3.000',
                harga_per_kg: '2500.00',
                total_penjualan: '7500.00',
                tanggal: today
            })
            .returning()
            .execute();

        return {
            nasabah,
            pengepul,
            jenisSampah,
            setoranTransaction: setoranResult[0],
            dates: { today, yesterday, twoDaysAgo }
        };
    };

    describe('getLaporanTransaksi', () => {
        it('should get all transactions without date filter', async () => {
            await setupTestData();

            const filters: ReportFilters = {};
            const result = await getLaporanTransaksi(filters);

            expect(result).toHaveLength(3);
            
            // Check that all transaction types are included
            const types = result.map(r => r.type);
            expect(types).toContain('setoran');
            expect(types).toContain('tarik_saldo');
            expect(types).toContain('penjualan');

            // Check setoran transaction structure
            const setoranTx = result.find(r => r.type === 'setoran');
            expect(setoranTx).toBeDefined();
            expect(setoranTx!.nasabah_nama).toBe('Test Nasabah');
            expect(setoranTx!.jenis_sampah).toBe('Plastik Botol');
            expect(setoranTx!.berat).toBe(5.0);
            expect(setoranTx!.jumlah).toBe(10000.0);
            expect(setoranTx!.keterangan).toBe('Setoran sampah Plastik Botol - 5kg');

            // Check tarik saldo transaction structure
            const tarikTx = result.find(r => r.type === 'tarik_saldo');
            expect(tarikTx).toBeDefined();
            expect(tarikTx!.nasabah_nama).toBe('Test Nasabah');
            expect(tarikTx!.jenis_sampah).toBe(null);
            expect(tarikTx!.berat).toBe(null);
            expect(tarikTx!.jumlah).toBe(5000.0);
            expect(tarikTx!.keterangan).toBe('Penarikan saldo');

            // Check penjualan transaction structure
            const penjualanTx = result.find(r => r.type === 'penjualan');
            expect(penjualanTx).toBeDefined();
            expect(penjualanTx!.pengepul_nama).toBe('Test Pengepul');
            expect(penjualanTx!.jenis_sampah).toBe('Plastik Botol');
            expect(penjualanTx!.berat).toBe(3.0);
            expect(penjualanTx!.jumlah).toBe(7500.0);
        });

        it('should filter transactions by date range', async () => {
            const { dates } = await setupTestData();

            // Filter for today only
            const todayStr = dates.today.toISOString().split('T')[0];
            const filters: ReportFilters = {
                start_date: todayStr,
                end_date: todayStr
            };

            const result = await getLaporanTransaksi(filters);

            // Should only get penjualan transaction from today
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('penjualan');
        });

        it('should sort transactions by date descending', async () => {
            await setupTestData();

            const filters: ReportFilters = {};
            const result = await getLaporanTransaksi(filters);

            expect(result).toHaveLength(3);
            
            // Should be sorted newest first
            for (let i = 1; i < result.length; i++) {
                expect(result[i - 1].tanggal.getTime()).toBeGreaterThanOrEqual(
                    result[i].tanggal.getTime()
                );
            }
        });
    });

    describe('getLaporanPerNasabah', () => {
        it('should get comprehensive report for nasabah', async () => {
            const { nasabah } = await setupTestData();

            const result = await getLaporanPerNasabah(nasabah.id);

            // Check nasabah details
            expect(result.nasabah.id).toBe(nasabah.id);
            expect(result.nasabah.nama).toBe('Test Nasabah');
            expect(result.nasabah.saldo).toBe(55000.0); // Updated saldo after transactions
            expect(result.saldo_saat_ini).toBe(55000.0);

            // Check setoran transactions
            expect(result.transaksi_setoran).toHaveLength(1);
            expect(result.transaksi_setoran[0].berat).toBe(5.0);
            expect(result.transaksi_setoran[0].total_setoran).toBe(10000.0);

            // Check tarik saldo transactions
            expect(result.transaksi_tarik_saldo).toHaveLength(1);
            expect(result.transaksi_tarik_saldo[0].jumlah_penarikan).toBe(5000.0);
        });

        it('should throw error for non-existent nasabah', async () => {
            expect(getLaporanPerNasabah(999)).rejects.toThrow(/nasabah not found/i);
        });

        it('should return empty transactions for nasabah with no transactions', async () => {
            // Create nasabah without transactions
            const nasabahResult = await db.insert(nasabahTable)
                .values({
                    kode: 'NSB002',
                    nama: 'Empty Nasabah',
                    nik_nip: '0987654321',
                    alamat: 'Empty Address',
                    instansi: null,
                    saldo: '0.00'
                })
                .returning()
                .execute();

            const result = await getLaporanPerNasabah(nasabahResult[0].id);

            expect(result.nasabah.nama).toBe('Empty Nasabah');
            expect(result.transaksi_setoran).toHaveLength(0);
            expect(result.transaksi_tarik_saldo).toHaveLength(0);
            expect(result.saldo_saat_ini).toBe(0.0);
        });
    });

    describe('getNotaPenyetoran', () => {
        it('should get transaction receipt with all details', async () => {
            const { setoranTransaction } = await setupTestData();

            const result = await getNotaPenyetoran(setoranTransaction.id);

            // Check transaction details
            expect(result.transaksi.id).toBe(setoranTransaction.id);
            expect(result.transaksi.berat).toBe(5.0);
            expect(result.transaksi.harga_per_kg).toBe(2000.0);
            expect(result.transaksi.total_setoran).toBe(10000.0);

            // Check nasabah details
            expect(result.nasabah.nama).toBe('Test Nasabah');
            expect(result.nasabah.kode).toBe('NSB001');
            expect(result.nasabah.saldo).toBe(55000.0); // Updated saldo after transactions

            // Check jenis sampah details
            expect(result.jenis_sampah.jenis_sampah).toBe('Plastik Botol');
            expect(result.jenis_sampah.harga_beli).toBe(2000.0);
            expect(result.jenis_sampah.harga_jual).toBe(2500.0);
        });

        it('should throw error for non-existent transaction', async () => {
            expect(getNotaPenyetoran(999)).rejects.toThrow(/transaction not found/i);
        });

        it('should handle numeric conversions correctly', async () => {
            const { setoranTransaction } = await setupTestData();

            const result = await getNotaPenyetoran(setoranTransaction.id);

            // Verify all numeric fields are properly converted
            expect(typeof result.transaksi.berat).toBe('number');
            expect(typeof result.transaksi.harga_per_kg).toBe('number');
            expect(typeof result.transaksi.total_setoran).toBe('number');
            expect(typeof result.nasabah.saldo).toBe('number');
            expect(typeof result.jenis_sampah.harga_beli).toBe('number');
            expect(typeof result.jenis_sampah.harga_jual).toBe('number');
        });
    });

    describe('getLaporanTransaksiByDateRange', () => {
        it('should get transactions within specific date range', async () => {
            const { dates } = await setupTestData();

            // Get transactions for yesterday only
            const yesterdayStr = dates.yesterday.toISOString().split('T')[0];
            
            const result = await getLaporanTransaksiByDateRange(yesterdayStr, yesterdayStr);

            // Should only get setoran transaction from yesterday
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('setoran');
            expect(result[0].tanggal.toDateString()).toBe(dates.yesterday.toDateString());
        });

        it('should get transactions for multiple days', async () => {
            const { dates } = await setupTestData();

            // Get all transactions from two days ago to today
            const startStr = dates.twoDaysAgo.toISOString().split('T')[0];
            const endStr = dates.today.toISOString().split('T')[0];
            
            const result = await getLaporanTransaksiByDateRange(startStr, endStr);

            // Should get all 3 transactions
            expect(result).toHaveLength(3);
        });

        it('should return empty array for date range with no transactions', async () => {
            await setupTestData();

            // Use future date range
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dayAfter = new Date();
            dayAfter.setDate(dayAfter.getDate() + 2);

            const startStr = tomorrow.toISOString().split('T')[0];
            const endStr = dayAfter.toISOString().split('T')[0];
            
            const result = await getLaporanTransaksiByDateRange(startStr, endStr);

            expect(result).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            // Test with invalid date format
            const filters: ReportFilters = {
                start_date: 'invalid-date'
            };

            expect(getLaporanTransaksi(filters)).rejects.toThrow();
        });

        it('should preserve error context in logs', async () => {
            // Test with invalid nasabah ID - should throw error
            expect(getLaporanPerNasabah(-1)).rejects.toThrow();
        });
    });
});