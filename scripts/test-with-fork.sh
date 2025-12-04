#!/bin/bash
# 启动Base主网的本地fork节点并运行测试

set -e  # 遇到错误立即退出

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔧 Starting Hardhat Fork Node for Base Mainnet..."
echo "Project root: $PROJECT_ROOT"
echo ""

# 清理可能存在的旧进程
pkill -f "hardhat node" || true
sleep 2

# 启动fork节点(后台运行)
cd "$PROJECT_ROOT/contracts"
echo "📡 Starting fork node on http://localhost:8545..."
pnpm hardhat node --fork https://mainnet.base.org --port 8545 > /tmp/hardhat-node.log 2>&1 &
HARDHAT_PID=$!

echo "⏳ Waiting for node to start (PID: $HARDHAT_PID)..."
sleep 10

# 检查节点是否启动成功
if ! kill -0 $HARDHAT_PID 2>/dev/null; then
  echo "❌ Failed to start Hardhat node"
  cat /tmp/hardhat-node.log
  exit 1
fi

echo "✅ Fork node started successfully"
echo ""

# 部署TokenDoctor到本地fork
echo "🚀 Deploying TokenDoctor to local fork..."
DEPLOY_OUTPUT=$(pnpm hardhat run scripts/deploy-doctor.ts --network localhost 2>&1)
echo "$DEPLOY_OUTPUT"

DOCTOR_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE "0x[a-fA-F0-9]{40}" | tail -1)

if [ -z "$DOCTOR_ADDRESS" ]; then
  echo "❌ Failed to extract contract address"
  echo "Deploy output:"
  echo "$DEPLOY_OUTPUT"
  kill $HARDHAT_PID
  exit 1
fi

echo ""
echo "✅ TokenDoctor deployed to: $DOCTOR_ADDRESS"
echo ""

# 备份原始.env
cd "$PROJECT_ROOT/backend"
if [ -f .env ]; then
  cp .env .env.backup
  echo "📦 Backed up original .env to .env.backup"
fi

# 创建测试配置
echo "📝 Creating test configuration..."
cat > .env << EOF
RPC_URL="http://localhost:8545"
DOCTOR_ADDRESS_PLACEHOLDER="$DOCTOR_ADDRESS"
WETH_ADDRESS="0x4200000000000000000000000000000000000006"
UNISWAP_V3_ROUTER="0x2626664c2603336E57B271c5C0b26F421741e481"
UNISWAP_V2_ROUTER="0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24"
SENDER="0x5C7C4ce6EB0D638AF91C2726BFeA5F6A8ABB0a61"
SIMULATE_AMOUNT_ETH="0.1"
EOF

echo "✅ Configuration updated"
echo ""

# 移除测试中的.skip()
echo "🔧 Enabling skipped tests..."
cd "$PROJECT_ROOT/backend"

# 备份测试文件
cp src/simulation/simulation.service.spec.ts src/simulation/simulation.service.spec.ts.backup
cp test/simulation.e2e-spec.ts test/simulation.e2e-spec.ts.backup

# 移除.skip()
sed -i '' 's/describe\.skip(/describe(/g' src/simulation/simulation.service.spec.ts
sed -i '' 's/describe\.skip(/describe(/g' test/simulation.e2e-spec.ts

echo "✅ Tests enabled"
echo ""

# 运行测试
echo "🧪 Running tests against local fork..."
echo "===================================="
echo ""

pnpm test
TEST_EXIT_CODE=$?

echo ""
echo "===================================="
echo ""

# 恢复测试文件
echo "🔄 Restoring test files..."
mv src/simulation/simulation.service.spec.ts.backup src/simulation/simulation.service.spec.ts
mv test/simulation.e2e-spec.ts.backup test/simulation.e2e-spec.ts

# 恢复原始.env
if [ -f .env.backup ]; then
  mv .env.backup .env
  echo "✅ Restored original .env"
else
  rm -f .env
fi

# 清理
echo "🧹 Cleaning up..."
kill $HARDHAT_PID 2>/dev/null || true
sleep 2
pkill -f "hardhat node" || true

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

exit $TEST_EXIT_CODE
