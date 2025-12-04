#!/bin/bash
# 部署TokenDoctor合约到Base主网

echo "🚀 Deploying TokenDoctor to Base Mainnet..."

cd ../contracts

# 确保环境变量已设置
if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Error: PRIVATE_KEY environment variable not set"
  echo "Please set it with: export PRIVATE_KEY='your-private-key'"
  exit 1
fi

if [ -z "$BASE_RPC_URL" ]; then
  echo "⚠️  BASE_RPC_URL not set, using default: https://mainnet.base.org"
  export BASE_RPC_URL="https://mainnet.base.org"
fi

# 编译合约
echo "📦 Compiling contracts..."
pnpm hardhat compile

# 部署合约
echo "🔨 Deploying TokenDoctor..."
pnpm hardhat run scripts/deploy-doctor.ts --network base

echo ""
echo "✅ Deployment complete!"
echo "📝 Update backend/.env with the deployed contract address:"
echo "   DOCTOR_ADDRESS_PLACEHOLDER='0xYourDeployedAddress'"
