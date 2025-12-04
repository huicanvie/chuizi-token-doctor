import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimulationModule } from './simulation/simulation.module';

@Module({
  imports: [
    SimulationModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
