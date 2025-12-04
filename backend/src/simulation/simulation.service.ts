import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, ErrorDescription } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { RiskLevel } from '../types';

export interface SimulationReport {
  success: boolean;
  buySuccess: boolean;
  sellSuccess: boolean;
  buyGasUsed: string;
  sellGasUsed: string;
  buyTaxPercent: string;
  sellTaxPercent: string; // SellTax == TotalTax
  error?: string;
  riskLevel: RiskLevel; // risk level based on tax and gas
}

interface EthersError {
  data?: string;
  info?: {
    error?: {
      data?: string;
    };
  };
  message?: string;
}

@Injectable()
export class SimulationService implements OnModuleInit {
  private readonly logger = new Logger(SimulationService.name);
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private doctorAbi: ethers.InterfaceAbi;
  private doctorBytecode: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // contarct ABI
    try {
      const artfiactPath = path.resolve(
        process.cwd(),
        '../contracts/artifacts/contracts/TokenDoctor.sol/TokenDoctor.json',
      );
      if (!fs.existsSync(artfiactPath)) {
        this.logger.error(
          `❌ Contract artifact not found at path: ${artfiactPath}`,
        );
        return;
      }

      const artifact = JSON.parse(fs.readFileSync(artfiactPath, 'utf8')) as {
        abi: ethers.InterfaceAbi;
        bytecode: string;
      };
      this.doctorAbi = artifact.abi;
      this.doctorBytecode = artifact.bytecode ?? '';
      this.logger.log('✅ Contract artifact loaded successfully');
    } catch (err) {
      this.logger.error('❌ Failed to load contract artifact:', err);
    }
  }

  /**
   * token simulation
   * @param tokenAddress token address
   * @param isV3  uniswap V3 or V2
   * @param feeTier V3 fee
   */
  async simulate(
    tokenAddress: string,
    isV3: boolean = true,
    feeTier: number = 3000,
  ): Promise<SimulationReport> {
    // get settings
    const doctorAddress = this.configService.get<string>(
      'DOCTOR_ADDRESS_PLACEHOLDER',
    );
    const wethAddress = this.configService.get<string>('WETH_ADDRESS');
    const v3Router = this.configService.get<string>('UNISWAP_V3_ROUTER');
    const v2Router = this.configService.get<string>('UNISWAP_V2_ROUTER');
    const simAmount = this.configService.get<string>(
      'SIMULATE_AMOUNT_ETH',
      '0.1',
    );
    const sender = this.configService.get<string>('SENDER');

    const router = isV3 ? v3Router : v2Router;
    const fee = isV3 ? feeTier : 0;

    this.logger.log(
      `💉 Simulating ${tokenAddress} on ${isV3 ? 'V3' : 'V2'} (Fee: ${fee})`,
    );

    //
    const contractInterface = new ethers.Interface(this.doctorAbi);
    const txData = contractInterface.encodeFunctionData('simulation', [
      tokenAddress,
      router,
      wethAddress,
      fee,
    ]);

    try {
      // Check if we're using a real deployed contract or need state override
      const code = await this.provider.getCode(doctorAddress ?? '');
      const contractExists = code !== '0x';

      let stateOverride: Record<string, { code: string }> | undefined =
        undefined;
      if (!contractExists) {
        // Contract doesn't exist, inject bytecode via state override
        stateOverride = {
          [doctorAddress as string]: {
            code: this.doctorBytecode,
          },
        };
      }

      // Always use provider.send() - Anvil handles both cases correctly
      const callParams: [any, string, ...any[]] = [
        {
          from: sender,
          to: doctorAddress,
          data: txData,
          value: ethers.toQuantity(ethers.parseEther(simAmount)),
        },
        'latest',
      ];

      if (stateOverride) {
        callParams.push(stateOverride);
      }

      await this.provider.send('eth_call', callParams);

      //
      this.logger.warn('Simulation finished without revert (Unexpected).');

      return this.createErrorReport('Contract did not revert with result');
      // try start
    } catch (err: unknown) {
      const ethersError = err as EthersError;
      return this.parseRevertData(ethersError, contractInterface);
    }
  }

  private parseRevertData(
    err: EthersError,
    iface: ethers.Interface,
  ): SimulationReport {
    let revertData: string | undefined;

    // Try to extract revert data from error structure    // Try multiple ways to extract revert data
    // For ethers.js v6 Contract errors

    const anyErr: any = err;

    if (err.data) {
      revertData = err.data;
      this.logger.debug('Found revert data in err.data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } else if (anyErr.error?.data) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      revertData = anyErr.error.data;
      this.logger.debug('Found revert data in anyErr.error.data');
    } else if (err.info?.error?.data) {
      // For nested error structures, extract the data field
      const errorData = err.info.error.data;
      if (typeof errorData === 'string') {
        revertData = errorData;
        this.logger.debug('Found revert data in err.info.error.data (string)');
      } else if (typeof errorData === 'object' && errorData !== null) {
        // If it's an object, it might have a 'data' field or be a revert error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        revertData = (errorData as any).data;
        this.logger.debug('Found revert data in err.info.error.data.data');
      }
    }

    if (!revertData) {
      this.logger.error(
        'RPC Error (No Revert Data):',
        err.message || 'Unknown error',
      );
    }

    try {
      const safeData = String(revertData);

      const decoded = iface.parseError(
        safeData,
      ) as unknown as ErrorDescription | null;

      if (decoded && decoded.name === 'SimulationResult') {
        const args = decoded.args;
        const buySuccess = Boolean(args[0]);
        const sellSuccess = Boolean(args[1]);
        const buyTax = BigInt(String(args[2]));
        const sellTax = BigInt(String(args[3]));
        const buyGasUsed = BigInt(String(args[4]));
        const sellGasUsed = BigInt(String(args[5]));
        const contractError = String(args[6]);

        const buyTaxPct = (Number(buyTax) / 100).toFixed(2);
        const sellTaxPct = (Number(sellTax) / 100).toFixed(2);
        const sellTaxNum = Number(sellTax);

        // risk level
        let riskLevel: RiskLevel = RiskLevel.LOW;
        if (!buySuccess) riskLevel = RiskLevel.HIGH;
        if (!sellSuccess)
          riskLevel = RiskLevel.CRITICAL; // can not sell
        else if (sellTaxNum > 3000) riskLevel = RiskLevel.HIGH; // risk > 30%
        this.logger.log(
          `📊 Report: Buy=${buySuccess}, Sell=${sellSuccess}, Loss=${sellTaxPct}%`,
        );

        const contractErrorStr =
          typeof contractError === 'string'
            ? contractError
            : String(contractError ?? '');

        return {
          success: true,
          buySuccess,
          sellSuccess,
          buyGasUsed: buyGasUsed.toString(),
          sellGasUsed: sellGasUsed.toString(),
          buyTaxPercent: buyTaxPct,
          sellTaxPercent: sellTaxPct,
          error: contractErrorStr || undefined,
          riskLevel,
        };
      }
    } catch (decodeErr) {
      const errMsg =
        decodeErr instanceof Error ? decodeErr.message : String(decodeErr);
      this.logger.error('Failed to decode error data', errMsg);
    }

    return this.createErrorReport('Unknown Revert Format / Decode Failed');
  }

  private createErrorReport(message: string): SimulationReport {
    return {
      success: false,
      buySuccess: false,
      sellSuccess: false,
      buyGasUsed: '0',
      sellGasUsed: '0',
      buyTaxPercent: '0',
      sellTaxPercent: '0',
      error: message,
      riskLevel: RiskLevel.CRITICAL,
    };
  }
}
