// 使用ethers直接连接到localhost
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Deploying TokenDoctor contract...\n');

  // 连接到本地fork节点
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  // 使用hardhat默认账户
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('📝 Deploying with account:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH\n');

  // 加载合约
  const artifactPath = path.resolve(process.cwd(), 'artifacts/contracts/TokenDoctor.sol/TokenDoctor.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // 部署TokenDoctor
  console.log('🔨 Deploying TokenDoctor...');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const doctor = await factory.deploy();
  
  await doctor.waitForDeployment();
  const doctorAddress = await doctor.getAddress();

  console.log('✅ TokenDoctor deployed to:', doctorAddress);
  console.log('\n📋 Next steps:');
  console.log('1. Update backend/.env:');
  console.log(`   DOCTOR_ADDRESS_PLACEHOLDER="${doctorAddress}"`);
  console.log('\n2. Remove .skip() from tests in:');
  console.log('   - backend/src/simulation/simulation.service.spec.ts');
  console.log('   - backend/test/simulation.e2e-spec.ts');
  console.log('\n3. Run tests:');
  console.log('   cd backend && pnpm test');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
