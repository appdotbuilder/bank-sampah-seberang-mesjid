import { z } from 'zod';

// User roles enum
export const userRoleSchema = z.enum(['administrator', 'petugas']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Login input schema
export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Create user input schema
export const createUserInputSchema = z.object({
  username: z.string(),
  password: z.string(),
  name: z.string(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Nasabah (Customer) schema
export const nasabahSchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  nik_nip: z.string(),
  alamat: z.string(),
  instansi: z.string().nullable(),
  saldo: z.number(),
  created_at: z.coerce.date()
});

export type Nasabah = z.infer<typeof nasabahSchema>;

// Create nasabah input schema
export const createNasabahInputSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  nik_nip: z.string(),
  alamat: z.string(),
  instansi: z.string().nullable()
});

export type CreateNasabahInput = z.infer<typeof createNasabahInputSchema>;

// Update nasabah input schema
export const updateNasabahInputSchema = z.object({
  id: z.number(),
  kode: z.string().optional(),
  nama: z.string().optional(),
  nik_nip: z.string().optional(),
  alamat: z.string().optional(),
  instansi: z.string().nullable().optional()
});

export type UpdateNasabahInput = z.infer<typeof updateNasabahInputSchema>;

// Petugas (Officer) schema
export const petugasSchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  nik_nip: z.string(),
  alamat: z.string(),
  instansi: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Petugas = z.infer<typeof petugasSchema>;

// Create petugas input schema
export const createPetugasInputSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  nik_nip: z.string(),
  alamat: z.string(),
  instansi: z.string().nullable()
});

export type CreatePetugasInput = z.infer<typeof createPetugasInputSchema>;

// Update petugas input schema
export const updatePetugasInputSchema = z.object({
  id: z.number(),
  kode: z.string().optional(),
  nama: z.string().optional(),
  nik_nip: z.string().optional(),
  alamat: z.string().optional(),
  instansi: z.string().nullable().optional()
});

export type UpdatePetugasInput = z.infer<typeof updatePetugasInputSchema>;

// Jenis Sampah (Waste Type) schema
export const jenisSampahSchema = z.object({
  id: z.number(),
  kode: z.string(),
  jenis_sampah: z.string(),
  harga_beli: z.number(),
  harga_jual: z.number(),
  created_at: z.coerce.date()
});

export type JenisSampah = z.infer<typeof jenisSampahSchema>;

// Create jenis sampah input schema
export const createJenisSampahInputSchema = z.object({
  kode: z.string(),
  jenis_sampah: z.string(),
  harga_beli: z.number().positive(),
  harga_jual: z.number().positive()
});

export type CreateJenisSampahInput = z.infer<typeof createJenisSampahInputSchema>;

// Update jenis sampah input schema
export const updateJenisSampahInputSchema = z.object({
  id: z.number(),
  kode: z.string().optional(),
  jenis_sampah: z.string().optional(),
  harga_beli: z.number().positive().optional(),
  harga_jual: z.number().positive().optional()
});

export type UpdateJenisSampahInput = z.infer<typeof updateJenisSampahInputSchema>;

// Pengepul (Collector) schema
export const pengepulSchema = z.object({
  id: z.number(),
  kode: z.string(),
  nama: z.string(),
  alamat: z.string(),
  created_at: z.coerce.date()
});

export type Pengepul = z.infer<typeof pengepulSchema>;

// Create pengepul input schema
export const createPengepulInputSchema = z.object({
  kode: z.string(),
  nama: z.string(),
  alamat: z.string()
});

export type CreatePengepulInput = z.infer<typeof createPengepulInputSchema>;

// Update pengepul input schema
export const updatePengepulInputSchema = z.object({
  id: z.number(),
  kode: z.string().optional(),
  nama: z.string().optional(),
  alamat: z.string().optional()
});

export type UpdatePengepulInput = z.infer<typeof updatePengepulInputSchema>;

// Transaction type enum
export const transactionTypeSchema = z.enum(['setoran', 'tarik_saldo', 'penjualan']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Transaksi Setoran (Deposit Transaction) schema
export const transaksiSetoranSchema = z.object({
  id: z.number(),
  nasabah_id: z.number(),
  jenis_sampah_id: z.number(),
  berat: z.number(),
  harga_per_kg: z.number(),
  total_setoran: z.number(),
  tanggal: z.coerce.date(),
  created_at: z.coerce.date()
});

export type TransaksiSetoran = z.infer<typeof transaksiSetoranSchema>;

// Create transaksi setoran input schema
export const createTransaksiSetoranInputSchema = z.object({
  nasabah_id: z.number(),
  jenis_sampah_id: z.number(),
  berat: z.number().positive()
});

export type CreateTransaksiSetoranInput = z.infer<typeof createTransaksiSetoranInputSchema>;

// Transaksi Tarik Saldo (Withdrawal Transaction) schema
export const transaksiTarikSaldoSchema = z.object({
  id: z.number(),
  nasabah_id: z.number(),
  jumlah_penarikan: z.number(),
  tanggal: z.coerce.date(),
  created_at: z.coerce.date()
});

export type TransaksiTarikSaldo = z.infer<typeof transaksiTarikSaldoSchema>;

// Create transaksi tarik saldo input schema
export const createTransaksiTarikSaldoInputSchema = z.object({
  nasabah_id: z.number(),
  jumlah_penarikan: z.number().positive()
});

export type CreateTransaksiTarikSaldoInput = z.infer<typeof createTransaksiTarikSaldoInputSchema>;

// Transaksi Penjualan (Sales Transaction) schema
export const transaksiPenjualanSchema = z.object({
  id: z.number(),
  pengepul_id: z.number(),
  jenis_sampah_id: z.number(),
  berat: z.number(),
  harga_per_kg: z.number(),
  total_penjualan: z.number(),
  tanggal: z.coerce.date(),
  created_at: z.coerce.date()
});

export type TransaksiPenjualan = z.infer<typeof transaksiPenjualanSchema>;

// Create transaksi penjualan input schema
export const createTransaksiPenjualanInputSchema = z.object({
  pengepul_id: z.number(),
  jenis_sampah_id: z.number(),
  berat: z.number().positive()
});

export type CreateTransaksiPenjualanInput = z.infer<typeof createTransaksiPenjualanInputSchema>;

// Dashboard stats schema
export const dashboardStatsSchema = z.object({
  total_nasabah: z.number(),
  total_petugas: z.number(),
  total_jenis_sampah: z.number(),
  total_transaksi_setoran: z.number(),
  total_saldo_nasabah: z.number(),
  jumlah_permintaan_tarik_saldo: z.number(),
  total_stok_sampah: z.number(),
  total_sampah_terkirim: z.number(),
  keuntungan: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Report filters schema
export const reportFiltersSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  nasabah_id: z.number().optional()
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

// Laporan transaksi schema
export const laporanTransaksiSchema = z.object({
  id: z.number(),
  type: transactionTypeSchema,
  tanggal: z.coerce.date(),
  nasabah_nama: z.string().nullable(),
  pengepul_nama: z.string().nullable(),
  jenis_sampah: z.string().nullable(),
  berat: z.number().nullable(),
  jumlah: z.number(),
  keterangan: z.string()
});

export type LaporanTransaksi = z.infer<typeof laporanTransaksiSchema>;

// Stok sampah schema (for dashboard calculations)
export const stokSampahSchema = z.object({
  jenis_sampah_id: z.number(),
  jenis_sampah: z.string(),
  total_setoran: z.number(),
  total_terjual: z.number(),
  stok_tersisa: z.number()
});

export type StokSampah = z.infer<typeof stokSampahSchema>;