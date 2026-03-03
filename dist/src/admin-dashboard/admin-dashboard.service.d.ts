import { PrismaService } from '../prisma/prisma.service';
export declare class AdminDashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        summary: {
            users: number;
            programmes: number;
            batches: number;
        };
    }>;
}
