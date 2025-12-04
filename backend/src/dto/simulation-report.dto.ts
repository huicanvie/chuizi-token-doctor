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
