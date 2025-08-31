import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['administrator', 'petugas']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Nasabah (Customers) table
export const nasabahTable = pgTable('nasabah', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  nik_nip: text('nik_nip').notNull(),
  alamat: text('alamat').notNull(),
  instansi: text('instansi'), // Nullable
  saldo: numeric('saldo', { precision: 15, scale: 2 }).default('0').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Petugas (Officers) table
export const petugasTable = pgTable('petugas', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  nik_nip: text('nik_nip').notNull(),
  alamat: text('alamat').notNull(),
  instansi: text('instansi'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Jenis Sampah (Waste Types) table
export const jenisSampahTable = pgTable('jenis_sampah', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  jenis_sampah: text('jenis_sampah').notNull(),
  harga_beli: numeric('harga_beli', { precision: 10, scale: 2 }).notNull(),
  harga_jual: numeric('harga_jual', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Pengepul (Collectors) table
export const pengepulTable = pgTable('pengepul', {
  id: serial('id').primaryKey(),
  kode: text('kode').notNull().unique(),
  nama: text('nama').notNull(),
  alamat: text('alamat').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transaksi Setoran (Deposit Transactions) table
export const transaksiSetoranTable = pgTable('transaksi_setoran', {
  id: serial('id').primaryKey(),
  nasabah_id: integer('nasabah_id').notNull().references(() => nasabahTable.id),
  jenis_sampah_id: integer('jenis_sampah_id').notNull().references(() => jenisSampahTable.id),
  berat: numeric('berat', { precision: 10, scale: 3 }).notNull(), // Weight in kg with 3 decimal precision
  harga_per_kg: numeric('harga_per_kg', { precision: 10, scale: 2 }).notNull(),
  total_setoran: numeric('total_setoran', { precision: 15, scale: 2 }).notNull(),
  tanggal: timestamp('tanggal').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transaksi Tarik Saldo (Withdrawal Transactions) table
export const transaksiTarikSaldoTable = pgTable('transaksi_tarik_saldo', {
  id: serial('id').primaryKey(),
  nasabah_id: integer('nasabah_id').notNull().references(() => nasabahTable.id),
  jumlah_penarikan: numeric('jumlah_penarikan', { precision: 15, scale: 2 }).notNull(),
  tanggal: timestamp('tanggal').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Transaksi Penjualan (Sales Transactions) table
export const transaksiPenjualanTable = pgTable('transaksi_penjualan', {
  id: serial('id').primaryKey(),
  pengepul_id: integer('pengepul_id').notNull().references(() => pengepulTable.id),
  jenis_sampah_id: integer('jenis_sampah_id').notNull().references(() => jenisSampahTable.id),
  berat: numeric('berat', { precision: 10, scale: 3 }).notNull(),
  harga_per_kg: numeric('harga_per_kg', { precision: 10, scale: 2 }).notNull(),
  total_penjualan: numeric('total_penjualan', { precision: 15, scale: 2 }).notNull(),
  tanggal: timestamp('tanggal').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Nasabah = typeof nasabahTable.$inferSelect;
export type NewNasabah = typeof nasabahTable.$inferInsert;
export type Petugas = typeof petugasTable.$inferSelect;
export type NewPetugas = typeof petugasTable.$inferInsert;
export type JenisSampah = typeof jenisSampahTable.$inferSelect;
export type NewJenisSampah = typeof jenisSampahTable.$inferInsert;
export type Pengepul = typeof pengepulTable.$inferSelect;
export type NewPengepul = typeof pengepulTable.$inferInsert;
export type TransaksiSetoran = typeof transaksiSetoranTable.$inferSelect;
export type NewTransaksiSetoran = typeof transaksiSetoranTable.$inferInsert;
export type TransaksiTarikSaldo = typeof transaksiTarikSaldoTable.$inferSelect;
export type NewTransaksiTarikSaldo = typeof transaksiTarikSaldoTable.$inferInsert;
export type TransaksiPenjualan = typeof transaksiPenjualanTable.$inferSelect;
export type NewTransaksiPenjualan = typeof transaksiPenjualanTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  nasabah: nasabahTable,
  petugas: petugasTable,
  jenisSampah: jenisSampahTable,
  pengepul: pengepulTable,
  transaksiSetoran: transaksiSetoranTable,
  transaksiTarikSaldo: transaksiTarikSaldoTable,
  transaksiPenjualan: transaksiPenjualanTable,
};