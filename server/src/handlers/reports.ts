import { db } from '../db';
import { 
    type ReportFilters, 
    type LaporanTransaksi,
    type TransaksiSetoran,
    type TransaksiTarikSaldo,
    type Nasabah,
    type JenisSampah,
    type TransaksiPenjualan
} from '../schema';
import {
    transaksiSetoranTable,
    transaksiTarikSaldoTable,
    transaksiPenjualanTable,
    nasabahTable,
    pengepulTable,
    jenisSampahTable
} from '../db/schema';
import { eq, gte, lte, and, SQL } from 'drizzle-orm';

export const getLaporanTransaksi = async (filters: ReportFilters): Promise<LaporanTransaksi[]> => {
    try {
        const results: LaporanTransaksi[] = [];

        // Build date filter conditions if provided
        const dateConditions: SQL<unknown>[] = [];
        if (filters.start_date) {
            const startDate = new Date(filters.start_date);
            startDate.setHours(0, 0, 0, 0); // Start of day
            dateConditions.push(gte(transaksiSetoranTable.tanggal, startDate));
        }
        if (filters.end_date) {
            const endDate = new Date(filters.end_date);
            endDate.setHours(23, 59, 59, 999); // End of day
            dateConditions.push(lte(transaksiSetoranTable.tanggal, endDate));
        }

        // Query transaksi setoran
        let setoranQuery = db.select()
            .from(transaksiSetoranTable)
            .innerJoin(nasabahTable, eq(transaksiSetoranTable.nasabah_id, nasabahTable.id))
            .innerJoin(jenisSampahTable, eq(transaksiSetoranTable.jenis_sampah_id, jenisSampahTable.id));

        if (dateConditions.length > 0) {
            setoranQuery = setoranQuery.where(dateConditions.length === 1 ? dateConditions[0] : and(...dateConditions)) as typeof setoranQuery;
        }

        const setoranResults = await setoranQuery.execute();

        // Add setoran transactions to results
        for (const result of setoranResults) {
            results.push({
                id: result.transaksi_setoran.id,
                type: 'setoran',
                tanggal: result.transaksi_setoran.tanggal,
                nasabah_nama: result.nasabah.nama,
                pengepul_nama: null,
                jenis_sampah: result.jenis_sampah.jenis_sampah,
                berat: parseFloat(result.transaksi_setoran.berat),
                jumlah: parseFloat(result.transaksi_setoran.total_setoran),
                keterangan: `Setoran sampah ${result.jenis_sampah.jenis_sampah} - ${parseFloat(result.transaksi_setoran.berat)}kg`
            });
        }

        // Query transaksi tarik saldo with date filter
        const tarikDateConditions: SQL<unknown>[] = [];
        if (filters.start_date) {
            const startDate = new Date(filters.start_date);
            startDate.setHours(0, 0, 0, 0); // Start of day
            tarikDateConditions.push(gte(transaksiTarikSaldoTable.tanggal, startDate));
        }
        if (filters.end_date) {
            const endDate = new Date(filters.end_date);
            endDate.setHours(23, 59, 59, 999); // End of day
            tarikDateConditions.push(lte(transaksiTarikSaldoTable.tanggal, endDate));
        }

        let tarikQuery = db.select()
            .from(transaksiTarikSaldoTable)
            .innerJoin(nasabahTable, eq(transaksiTarikSaldoTable.nasabah_id, nasabahTable.id));

        if (tarikDateConditions.length > 0) {
            tarikQuery = tarikQuery.where(tarikDateConditions.length === 1 ? tarikDateConditions[0] : and(...tarikDateConditions)) as typeof tarikQuery;
        }

        const tarikResults = await tarikQuery.execute();

        // Add tarik saldo transactions to results
        for (const result of tarikResults) {
            results.push({
                id: result.transaksi_tarik_saldo.id,
                type: 'tarik_saldo',
                tanggal: result.transaksi_tarik_saldo.tanggal,
                nasabah_nama: result.nasabah.nama,
                pengepul_nama: null,
                jenis_sampah: null,
                berat: null,
                jumlah: parseFloat(result.transaksi_tarik_saldo.jumlah_penarikan),
                keterangan: `Penarikan saldo`
            });
        }

        // Query transaksi penjualan with date filter
        const jualDateConditions: SQL<unknown>[] = [];
        if (filters.start_date) {
            const startDate = new Date(filters.start_date);
            startDate.setHours(0, 0, 0, 0); // Start of day
            jualDateConditions.push(gte(transaksiPenjualanTable.tanggal, startDate));
        }
        if (filters.end_date) {
            const endDate = new Date(filters.end_date);
            endDate.setHours(23, 59, 59, 999); // End of day
            jualDateConditions.push(lte(transaksiPenjualanTable.tanggal, endDate));
        }

        let jualQuery = db.select()
            .from(transaksiPenjualanTable)
            .innerJoin(pengepulTable, eq(transaksiPenjualanTable.pengepul_id, pengepulTable.id))
            .innerJoin(jenisSampahTable, eq(transaksiPenjualanTable.jenis_sampah_id, jenisSampahTable.id));

        if (jualDateConditions.length > 0) {
            jualQuery = jualQuery.where(jualDateConditions.length === 1 ? jualDateConditions[0] : and(...jualDateConditions)) as typeof jualQuery;
        }

        const jualResults = await jualQuery.execute();

        // Add penjualan transactions to results
        for (const result of jualResults) {
            results.push({
                id: result.transaksi_penjualan.id,
                type: 'penjualan',
                tanggal: result.transaksi_penjualan.tanggal,
                nasabah_nama: null,
                pengepul_nama: result.pengepul.nama,
                jenis_sampah: result.jenis_sampah.jenis_sampah,
                berat: parseFloat(result.transaksi_penjualan.berat),
                jumlah: parseFloat(result.transaksi_penjualan.total_penjualan),
                keterangan: `Penjualan sampah ${result.jenis_sampah.jenis_sampah} - ${parseFloat(result.transaksi_penjualan.berat)}kg`
            });
        }

        // Sort by date descending
        results.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());

        return results;
    } catch (error) {
        console.error('Failed to get laporan transaksi:', error);
        throw error;
    }
};

export const getLaporanPerNasabah = async (nasabahId: number): Promise<{
    nasabah: Nasabah;
    transaksi_setoran: TransaksiSetoran[];
    transaksi_tarik_saldo: TransaksiTarikSaldo[];
    saldo_saat_ini: number;
}> => {
    try {
        // Get nasabah details
        const nasabahResult = await db.select()
            .from(nasabahTable)
            .where(eq(nasabahTable.id, nasabahId))
            .execute();

        if (nasabahResult.length === 0) {
            throw new Error('Nasabah not found');
        }

        const nasabah = {
            ...nasabahResult[0],
            saldo: parseFloat(nasabahResult[0].saldo)
        };

        // Get all setoran transactions for this nasabah
        const setoranResults = await db.select()
            .from(transaksiSetoranTable)
            .where(eq(transaksiSetoranTable.nasabah_id, nasabahId))
            .execute();

        const transaksi_setoran = setoranResults.map(result => ({
            ...result,
            berat: parseFloat(result.berat),
            harga_per_kg: parseFloat(result.harga_per_kg),
            total_setoran: parseFloat(result.total_setoran)
        }));

        // Get all tarik saldo transactions for this nasabah
        const tarikResults = await db.select()
            .from(transaksiTarikSaldoTable)
            .where(eq(transaksiTarikSaldoTable.nasabah_id, nasabahId))
            .execute();

        const transaksi_tarik_saldo = tarikResults.map(result => ({
            ...result,
            jumlah_penarikan: parseFloat(result.jumlah_penarikan)
        }));

        return {
            nasabah,
            transaksi_setoran,
            transaksi_tarik_saldo,
            saldo_saat_ini: nasabah.saldo
        };
    } catch (error) {
        console.error('Failed to get laporan per nasabah:', error);
        throw error;
    }
};

export const getNotaPenyetoran = async (transaksiId: number): Promise<{
    transaksi: TransaksiSetoran;
    nasabah: Nasabah;
    jenis_sampah: JenisSampah;
}> => {
    try {
        // Get transaksi setoran with nasabah and jenis sampah details
        const results = await db.select()
            .from(transaksiSetoranTable)
            .innerJoin(nasabahTable, eq(transaksiSetoranTable.nasabah_id, nasabahTable.id))
            .innerJoin(jenisSampahTable, eq(transaksiSetoranTable.jenis_sampah_id, jenisSampahTable.id))
            .where(eq(transaksiSetoranTable.id, transaksiId))
            .execute();

        if (results.length === 0) {
            throw new Error('Transaction not found');
        }

        const result = results[0];

        const transaksi = {
            ...result.transaksi_setoran,
            berat: parseFloat(result.transaksi_setoran.berat),
            harga_per_kg: parseFloat(result.transaksi_setoran.harga_per_kg),
            total_setoran: parseFloat(result.transaksi_setoran.total_setoran)
        };

        const nasabah = {
            ...result.nasabah,
            saldo: parseFloat(result.nasabah.saldo)
        };

        const jenis_sampah = {
            ...result.jenis_sampah,
            harga_beli: parseFloat(result.jenis_sampah.harga_beli),
            harga_jual: parseFloat(result.jenis_sampah.harga_jual)
        };

        return {
            transaksi,
            nasabah,
            jenis_sampah
        };
    } catch (error) {
        console.error('Failed to get nota penyetoran:', error);
        throw error;
    }
};

export const getLaporanTransaksiByDateRange = async (startDate: string, endDate: string): Promise<LaporanTransaksi[]> => {
    try {
        const filters: ReportFilters = {
            start_date: startDate,
            end_date: endDate
        };

        return await getLaporanTransaksi(filters);
    } catch (error) {
        console.error('Failed to get laporan transaksi by date range:', error);
        throw error;
    }
};