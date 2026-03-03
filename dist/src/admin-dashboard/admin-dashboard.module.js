"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDashboardModule = void 0;
const common_1 = require("@nestjs/common");
const admin_dashboard_controller_1 = require("./admin-dashboard.controller");
const admin_dashboard_service_1 = require("./admin-dashboard.service");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_guard_1 = require("../common/guards/roles.guard");
let AdminDashboardModule = class AdminDashboardModule {
};
exports.AdminDashboardModule = AdminDashboardModule;
exports.AdminDashboardModule = AdminDashboardModule = __decorate([
    (0, common_1.Module)({
        controllers: [admin_dashboard_controller_1.AdminDashboardController],
        providers: [admin_dashboard_service_1.AdminDashboardService, prisma_service_1.PrismaService, roles_guard_1.RolesGuard],
    })
], AdminDashboardModule);
//# sourceMappingURL=admin-dashboard.module.js.map