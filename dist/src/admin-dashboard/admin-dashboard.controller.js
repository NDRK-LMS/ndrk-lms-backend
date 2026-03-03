"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDashboardController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const admin_dashboard_service_1 = require("./admin-dashboard.service");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const shared_1 = require("@ndrk/shared");
let AdminDashboardController = class AdminDashboardController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getOverview() {
        return this.service.getOverview();
    }
};
exports.AdminDashboardController = AdminDashboardController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getOverview", null);
exports.AdminDashboardController = AdminDashboardController = __decorate([
    (0, common_1.Controller)('api/v1/admin/dashboard'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(shared_1.UserRole.SUPER_ADMIN, shared_1.UserRole.PROGRAMME_ADMIN),
    __metadata("design:paramtypes", [admin_dashboard_service_1.AdminDashboardService])
], AdminDashboardController);
//# sourceMappingURL=admin-dashboard.controller.js.map