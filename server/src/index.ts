import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
    loginInputSchema,
    createUserInputSchema,
    createNasabahInputSchema,
    updateNasabahInputSchema,
    createPetugasInputSchema,
    updatePetugasInputSchema,
    createJenisSampahInputSchema,
    updateJenisSampahInputSchema,
    createPengepulInputSchema,
    updatePengepulInputSchema,
    createTransaksiSetoranInputSchema,
    createTransaksiTarikSaldoInputSchema,
    createTransaksiPenjualanInputSchema,
    reportFiltersSchema
} from './schema';

// Import handlers
import { login, getCurrentUser } from './handlers/auth';
import { createUser, getUsers, deleteUser } from './handlers/users';
import { createNasabah, getNasabah, getNasabahById, updateNasabah, deleteNasabah } from './handlers/nasabah';
import { createPetugas, getPetugas, getPetugasById, updatePetugas, deletePetugas } from './handlers/petugas';
import { createJenisSampah, getJenisSampah, getJenisSampahById, updateJenisSampah, deleteJenisSampah } from './handlers/jenis_sampah';
import { createPengepul, getPengepul, getPengepulById, updatePengepul, deletePengepul } from './handlers/pengepul';
import { 
    createTransaksiSetoran, 
    createTransaksiTarikSaldo, 
    createTransaksiPenjualan,
    getTransaksiSetoran,
    getTransaksiTarikSaldo,
    getTransaksiPenjualan
} from './handlers/transactions';
import { getDashboardStats, getStokSampah } from './handlers/dashboard';
import { 
    getLaporanTransaksi, 
    getLaporanPerNasabah, 
    getNotaPenyetoran, 
    getLaporanTransaksiByDateRange 
} from './handlers/reports';

const t = initTRPC.create({
    transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
    // Health check
    healthcheck: publicProcedure.query(() => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }),

    // Authentication routes
    login: publicProcedure
        .input(loginInputSchema)
        .mutation(({ input }) => login(input)),
    
    getCurrentUser: publicProcedure
        .input(z.number())
        .query(({ input }) => getCurrentUser(input)),

    // User management routes (Admin only)
    createUser: publicProcedure
        .input(createUserInputSchema)
        .mutation(({ input }) => createUser(input)),
    
    getUsers: publicProcedure
        .query(() => getUsers()),
    
    deleteUser: publicProcedure
        .input(z.number())
        .mutation(({ input }) => deleteUser(input)),

    // Nasabah (Customer) routes
    createNasabah: publicProcedure
        .input(createNasabahInputSchema)
        .mutation(({ input }) => createNasabah(input)),
    
    getNasabah: publicProcedure
        .query(() => getNasabah()),
    
    getNasabahById: publicProcedure
        .input(z.number())
        .query(({ input }) => getNasabahById(input)),
    
    updateNasabah: publicProcedure
        .input(updateNasabahInputSchema)
        .mutation(({ input }) => updateNasabah(input)),
    
    deleteNasabah: publicProcedure
        .input(z.number())
        .mutation(({ input }) => deleteNasabah(input)),

    // Petugas (Officer) routes
    createPetugas: publicProcedure
        .input(createPetugasInputSchema)
        .mutation(({ input }) => createPetugas(input)),
    
    getPetugas: publicProcedure
        .query(() => getPetugas()),
    
    getPetugasById: publicProcedure
        .input(z.number())
        .query(({ input }) => getPetugasById(input)),
    
    updatePetugas: publicProcedure
        .input(updatePetugasInputSchema)
        .mutation(({ input }) => updatePetugas(input)),
    
    deletePetugas: publicProcedure
        .input(z.number())
        .mutation(({ input }) => deletePetugas(input)),

    // Jenis Sampah (Waste Type) routes
    createJenisSampah: publicProcedure
        .input(createJenisSampahInputSchema)
        .mutation(({ input }) => createJenisSampah(input)),
    
    getJenisSampah: publicProcedure
        .query(() => getJenisSampah()),
    
    getJenisSampahById: publicProcedure
        .input(z.number())
        .query(({ input }) => getJenisSampahById(input)),
    
    updateJenisSampah: publicProcedure
        .input(updateJenisSampahInputSchema)
        .mutation(({ input }) => updateJenisSampah(input)),
    
    deleteJenisSampah: publicProcedure
        .input(z.number())
        .mutation(({ input }) => deleteJenisSampah(input)),

    // Pengepul (Collector) routes
    createPengepul: publicProcedure
        .input(createPengepulInputSchema)
        .mutation(({ input }) => createPengepul(input)),
    
    getPengepul: publicProcedure
        .query(() => getPengepul()),
    
    getPengepulById: publicProcedure
        .input(z.number())
        .query(({ input }) => getPengepulById(input)),
    
    updatePengepul: publicProcedure
        .input(updatePengepulInputSchema)
        .mutation(({ input }) => updatePengepul(input)),
    
    deletePengepul: publicProcedure
        .input(z.number())
        .mutation(({ input }) => deletePengepul(input)),

    // Transaction routes
    createTransaksiSetoran: publicProcedure
        .input(createTransaksiSetoranInputSchema)
        .mutation(({ input }) => createTransaksiSetoran(input)),
    
    createTransaksiTarikSaldo: publicProcedure
        .input(createTransaksiTarikSaldoInputSchema)
        .mutation(({ input }) => createTransaksiTarikSaldo(input)),
    
    createTransaksiPenjualan: publicProcedure
        .input(createTransaksiPenjualanInputSchema)
        .mutation(({ input }) => createTransaksiPenjualan(input)),
    
    getTransaksiSetoran: publicProcedure
        .query(() => getTransaksiSetoran()),
    
    getTransaksiTarikSaldo: publicProcedure
        .query(() => getTransaksiTarikSaldo()),
    
    getTransaksiPenjualan: publicProcedure
        .query(() => getTransaksiPenjualan()),

    // Dashboard routes
    getDashboardStats: publicProcedure
        .query(() => getDashboardStats()),
    
    getStokSampah: publicProcedure
        .query(() => getStokSampah()),

    // Report routes
    getLaporanTransaksi: publicProcedure
        .input(reportFiltersSchema)
        .query(({ input }) => getLaporanTransaksi(input)),
    
    getLaporanPerNasabah: publicProcedure
        .input(z.number())
        .query(({ input }) => getLaporanPerNasabah(input)),
    
    getNotaPenyetoran: publicProcedure
        .input(z.number())
        .query(({ input }) => getNotaPenyetoran(input)),
    
    getLaporanTransaksiByDateRange: publicProcedure
        .input(z.object({
            startDate: z.string(),
            endDate: z.string()
        }))
        .query(({ input }) => getLaporanTransaksiByDateRange(input.startDate, input.endDate)),
});

export type AppRouter = typeof appRouter;

async function start() {
    const port = process.env['SERVER_PORT'] || 2022;
    const server = createHTTPServer({
        middleware: (req, res, next) => {
            cors()(req, res, next);
        },
        router: appRouter,
        createContext() {
            return {};
        },
    });
    server.listen(port);
    console.log(`Bank Sampah tRPC server listening at port: ${port}`);
}

start();