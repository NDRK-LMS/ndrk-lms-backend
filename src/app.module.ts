import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { LearnerModule } from './learner/learner.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { AdminProgrammesModule } from './admin-programmes/admin-programmes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    AdminDashboardModule,
    LearnerModule,
    AdminUsersModule,
    AdminProgrammesModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
