import { LearnerService } from './learner.service';
export declare class LearnerController {
    private readonly service;
    constructor(service: LearnerService);
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
