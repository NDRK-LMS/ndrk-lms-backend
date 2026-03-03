import { PrismaService } from '../prisma/prisma.service';
export declare class LearnerService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboard(userId: string): Promise<{
        user: {
            email: string;
            fullName: string;
            role: string;
            id: string;
        } | null;
        upcomingSessions: never[];
        pendingAssessments: never[];
        progressSummary: null;
    }>;
}
