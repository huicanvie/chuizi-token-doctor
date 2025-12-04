export type Language = 'en' | 'zh'

export interface Translations {
  title: string
  subtitle: string
  tokenAddress: string
  routerType: string
  feeTier: string
  simulate: string
  simulating: string
  invalidAddress: string
  buySuccess: string
  sellSuccess: string
  buyTax: string
  sellTax: string
  buyGas: string
  sellGas: string
  errorDetails: string
  honeypotWarning: string
  highTaxWarning: string
  poweredBy: string
  yes: string
  no: string
  risk: string
}

export const translations: Record<Language, Translations> = {
  en: {
    title: 'Token Doctor',
    subtitle: 'Simulate token buy/sell on Base mainnet',
    tokenAddress: 'Token Address',
    routerType: 'Router Type',
    feeTier: 'Fee Tier',
    simulate: 'Simulate',
    simulating: 'Simulating...',
    invalidAddress: 'Please enter a valid token address',
    buySuccess: 'Buy Success',
    sellSuccess: 'Sell Success',
    buyTax: 'Buy Tax',
    sellTax: 'Sell Tax',
    buyGas: 'Buy Gas Used',
    sellGas: 'Sell Gas Used',
    errorDetails: 'Error Details',
    honeypotWarning: 'Warning: This token cannot be sold! Possible honeypot.',
    highTaxWarning:
      'High Tax Detected: Sell tax is over 30%. Proceed with caution.',
    poweredBy: 'Powered by TokenDoctor Smart Contract on Base',
    yes: 'Yes',
    no: 'No',
    risk: 'RISK',
  },
  zh: {
    title: '代币检测器',
    subtitle: '在 Base 主网模拟代币买卖',
    tokenAddress: '代币地址',
    routerType: '路由类型',
    feeTier: '费率档位',
    simulate: '开始模拟',
    simulating: '模拟中...',
    invalidAddress: '请输入有效的代币地址',
    buySuccess: '买入成功',
    sellSuccess: '卖出成功',
    buyTax: '买入税',
    sellTax: '卖出税',
    buyGas: '买入 Gas',
    sellGas: '卖出 Gas',
    errorDetails: '错误详情',
    honeypotWarning: '警告：此代币无法卖出！可能是蜜罐。',
    highTaxWarning: '高税率警告：卖出税超过 30%，请谨慎操作。',
    poweredBy: '由 Base 上的 TokenDoctor 智能合约驱动',
    yes: '是',
    no: '否',
    risk: '风险',
  },
}
