# 完成Skip测试的完整指南

> **Language**: [English](./TESTING_GUIDE.md) | 中文

本项目有3个单元测试和6个E2E测试被跳过,原因是TokenDoctor合约通过State Override执行时失败。本指南提供多种方案来完成这些测试。

## 📊 当前测试状态

- ✅ **11个单元测试通过** - Mock测试,业务逻辑验证
- ⏭️ **3个单元测试跳过** - 需要真实Base链上交互
- ⏭️ **6个E2E测试跳过** - 需要真实合约部署

## 🎯 方案对比

| 方案 | 难度 | 成本 | 适用场景 | 推荐度 |
|------|------|------|----------|--------|
| 方案1: 部署到Base主网 | ⭐⭐⭐ | 💰💰 (需gas费) | 生产环境 | ⭐⭐⭐⭐⭐ |
| 方案2: 本地Fork节点 | ⭐⭐ | 💰 (免费) | 开发/CI | ⭐⭐⭐⭐⭐ |
| 方案3: 增强State Override | ⭐⭐⭐⭐ | 💰 (免费) | 实验性 | ⭐⭐ |
| 方案4: Mock完整流程 | ⭐ | 💰 (免费) | 快速验证 | ⭐⭐⭐ |

---

## 方案1: 部署TokenDoctor到Base主网 ⭐⭐⭐⭐⭐

### 优点
- ✅ 真实环境测试
- ✅ 无需本地节点
- ✅ 可重复使用部署的合约

### 步骤

#### 1. 准备部署环境
```bash
# 设置私钥(用于部署的钱包)
export PRIVATE_KEY="your-private-key-here"

# 确保钱包有足够的ETH用于gas费(约0.01 ETH)
```

#### 2. 配置Hardhat网络
编辑 `contracts/hardhat.config.ts`:
```typescript
networks: {
  base: {
    url: "https://mainnet.base.org",
    accounts: [process.env.PRIVATE_KEY!],
    chainId: 8453,
  }
}
```

#### 3. 部署合约
```bash
cd contracts
pnpm hardhat compile
pnpm hardhat run scripts/deploy-doctor.ts --network base
```

#### 4. 更新配置
将部署地址更新到 `backend/.env`:
```env
DOCTOR_ADDRESS_PLACEHOLDER="0xYourDeployedAddress"
```

#### 5. 移除测试skip并运行
```bash
# 手动编辑以下文件,删除 .skip()
# - backend/src/simulation/simulation.service.spec.ts
# - backend/test/simulation.e2e-spec.ts

cd backend
pnpm test        # 单元测试
pnpm test:e2e    # E2E测试
```

### 快速脚本
```bash
# 使用提供的脚本一键部署
chmod +x scripts/deploy-to-base.sh
./scripts/deploy-to-base.sh
```

---

## 方案2: 使用 Anvil Fork 节点 ⭐⭐⭐⭐⭐ (推荐)

### 优点
- ✅ 完全免费
- ✅ 真实Base状态
- ✅ 快速迭代
- ✅ 适合CI/CD
- ✅ RPC兼容性最好

### 前置要求
需要安装 Foundry (包含 Anvil):
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 步骤

#### 1. 启动 Anvil Fork 节点
```bash
# 在后台启动
nohup anvil --fork-url https://mainnet.base.org --port 8545 --host 0.0.0.0 > /tmp/anvil-fork.log 2>&1 &

# 等待启动
sleep 3

# 查看日志确认成功
tail -20 /tmp/anvil-fork.log
```

#### 2. 部署到本地Fork
```bash
cd contracts
pnpm exec tsx scripts/deploy-doctor.ts
# 输出: ✅ TokenDoctor deployed to: 0x49b84Ac45785fD635Bf00d5ebaeBD75E4725EeE2
```

#### 3. 给测试账户转账
```bash
cd backend
node -e "
const {ethers} = require('ethers');
const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const pk = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const wallet = new ethers.Wallet(pk, provider);
const sender = '0x5C7C4ce6EB0D638AF91C2726BFeA5F6A8ABB0a61';
wallet.sendTransaction({
  to: sender,
  value: ethers.parseEther('100')
}).then(tx => tx.wait()).then(() => console.log('✅ Transfer complete'));
"
```

#### 4. 确认配置
确保 `backend/.env` 包含:
```env
RPC_URL="http://localhost:8545"
DOCTOR_ADDRESS_PLACEHOLDER="0x49b84Ac45785fD635Bf00d5ebaeBD75E4725EeE2"
SIMULATE_AMOUNT_ETH="0.1"
```

#### 5. 运行测试
```bash
cd backend
pnpm test        # 单元测试: ✅ 14/14 通过
pnpm test:e2e    # E2E测试: ✅ 7/7 通过
```

### 一键测试脚本
```bash
# 停止旧节点
pkill -f "anvil.*8545" || true

# 启动 Anvil
nohup anvil --fork-url https://mainnet.base.org --port 8545 > /tmp/anvil-fork.log 2>&1 &
sleep 5

# 部署合约
cd contracts && pnpm exec tsx scripts/deploy-doctor.ts

# 转账
cd ../backend
node -e "const {ethers} = require('ethers'); const p = new ethers.JsonRpcProvider('http://localhost:8545'); const w = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p); w.sendTransaction({to: '0x5C7C4ce6EB0D638AF91C2726BFeA5F6A8ABB0a61', value: ethers.parseEther('100')}).then(tx => tx.wait()).then(() => console.log('✅ Ready'));"

# 运行测试
pnpm test && pnpm test:e2e
```

### 用于CI/CD
创建 `.github/workflows/test.yml`:
```yaml
name: Tests with Anvil Fork
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Start Anvil Fork
        run: |
          anvil --fork-url https://mainnet.base.org --port 8545 &
          sleep 5
      
      - name: Deploy contracts
        run: |
          cd contracts
          pnpm exec tsx scripts/deploy-doctor.ts
      
      - name: Fund test account
        run: |
          cd backend
          node -e "const {ethers} = require('ethers'); const p = new ethers.JsonRpcProvider('http://localhost:8545'); const w = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p); w.sendTransaction({to: '0x5C7C4ce6EB0D638AF91C2726BFeA5F6A8ABB0a61', value: ethers.parseEther('100')}).then(tx => tx.wait()).then(() => console.log('Done'));"
      
      - name: Run tests
        run: |
          cd backend
          pnpm test
          pnpm test:e2e
```

---

## 方案3: 增强State Override配置 ⭐⭐

### 优点
- ✅ 无需部署
- ✅ 无需本地节点

### 缺点
- ❌ 仍可能失败(复杂DeFi交互)
- ❌ 需要更多调试

### 实现

已创建增强版服务: `backend/src/simulation/enhanced-simulation.service.ts`

关键改进:
1. 为Doctor合约设置100 ETH余额
2. 为sender设置1000 ETH余额
3. 显式设置100M gas limit

使用方法:
```typescript
import { EnhancedSimulationService } from './enhanced-simulation.service';

// 在测试中使用
const result = await enhancedService.simulateEnhanced(
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  true,
  3000
);
```

---

## 方案4: Mock完整流程 ⭐⭐⭐

### 适合快速开发和单元测试

创建mock provider来模拟RPC响应:

```typescript
// 在测试中
const mockProvider = {
  send: jest.fn().mockImplementation((method, params) => {
    if (method === 'eth_call') {
      // 返回编码的SimulationResult错误
      const result = contractInterface.encodeError('SimulationResult', [
        true,  // buySuccess
        true,  // sellSuccess
        100,   // buyTax (1%)
        200,   // sellTax (2%)
        50000, // buyGasUsed
        30000, // sellGasUsed
        '',    // error
      ]);
      
      const error = new Error('execution reverted');
      error.data = result;
      throw error;
    }
  }),
};
```

---

## 🎬 快速开始 (推荐流程)

### 本地开发
```bash
# 1. 克隆并安装依赖
pnpm install

# 2. 使用Fork节点测试
./scripts/test-with-fork.sh
```

### 生产部署
```bash
# 1. 设置环境变量
export PRIVATE_KEY="your-key"

# 2. 部署到Base
./scripts/deploy-to-base.sh

# 3. 运行测试
cd backend
pnpm test
```

---

## 🔧 故障排除

### 问题1: Fork节点启动失败
```bash
# 解决方案: 使用不同的RPC
anvil --fork-url https://base.llamarpc.com --port 8545
```

### 问题2: 部署gas费不足
```bash
# 解决方案: 确保钱包有至少0.01 ETH
# 可以从CEX提现或使用跨链桥
```

### 问题3: 测试仍然失败
```bash
# 解决方案1: 增加模拟金额
SIMULATE_AMOUNT_ETH="0.5"  # 增加到0.5 ETH

# 解决方案2: 使用不同的测试token
# 尝试更活跃的流动性池
```

---

## 📚 相关文件

- `scripts/deploy-to-base.sh` - 部署到主网脚本
- `scripts/test-with-fork.sh` - Fork节点测试脚本
- `contracts/scripts/deploy-doctor.ts` - 部署脚本
- `backend/src/simulation/enhanced-simulation.service.ts` - 增强服务
- `backend/STATE_OVERRIDE_ANALYSIS.md` - State Override分析

---

## 💡 最佳实践建议

1. **开发阶段**: 使用方案2 (本地Fork)
2. **CI/CD**: 使用方案2 + GitHub Actions
3. **生产环境**: 使用方案1 (真实部署)
4. **快速迭代**: 使用方案4 (Mock)

---

## ❓ FAQ

**Q: 为什么State Override直接调用会失败?**
A: TokenDoctor合约需要与真实的Uniswap路由器交互,State Override只注入代码,缺少必要的链上状态(余额、授权、流动性等)。

**Q: 本地Fork会消耗真实ETH吗?**
A: 不会,Fork节点完全在本地运行,使用的是模拟账户和余额。

**Q: 部署到Base主网需要多少gas费?**
A: 约0.005-0.01 ETH,具体取决于网络拥堵情况。

**Q: 可以在测试网部署吗?**
A: Base测试网(Sepolia)也可以,但流动性池可能不完整,建议使用mainnet fork。
