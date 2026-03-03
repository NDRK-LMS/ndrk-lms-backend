import { AdminDashboardService } from './admin-dashboard.service';
export declare class AdminDashboardController {
    private readonly service;
    constructor(service: AdminDashboardService);
    getOverview(): Promise<{
        summary: {
            users: number;
            programmes: number;
            batches: number;
        };
    }>;
}
