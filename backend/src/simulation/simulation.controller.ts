import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { SimulationService, SimulationReport } from './simulation.service';

interface SimulationRequest {
  tokenAddress: string;
  isV3?: boolean;
  feeTier?: number;
}

@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('check')
  async checkToken(
    @Query('token') token: string,
    @Query('v3') v3: string, // 'true', 'false'
  ): Promise<SimulationReport> {
    if (!token) {
      throw new HttpException(
        'Token address is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isV3 = v3 === 'true';

    return await this.simulationService.simulate(token, isV3, 3000);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async simulate(@Body() body: SimulationRequest): Promise<SimulationReport> {
    const { tokenAddress, isV3 = true, feeTier = 3000 } = body;

    if (!tokenAddress) {
      throw new HttpException(
        'Token address is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.simulationService.simulate(tokenAddress, isV3, feeTier);
  }
}
