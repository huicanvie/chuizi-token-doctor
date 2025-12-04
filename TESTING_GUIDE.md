# Testing Guide - Token Simulation Service

> **Language**: English | [中文](./TESTING_GUIDE.zh-CN.md)

This document provides comprehensive testing methods for the Token Simulation Service, which uses the TokenDoctor smart contract to simulate token buy/sell operations on Base mainnet.

---

## 🎯 Test Overview

The project includes two types of tests:
- **Unit Tests**: 14 tests validating core logic
- **E2E Tests**: 7 tests validating HTTP API endpoints

Some tests require real Base mainnet interaction, which can be achieved through multiple solutions.

---

## 📊 Solution Comparison

| Solution | Advantages | Disadvantages | Recommended |
|---------|-----------|--------------|-------------|
| **1. Deploy to Base Mainnet** | ✅ Most realistic<br>✅ No local setup | ❌ Costs gas<br>❌ Requires ETH | Production |
| **2. Local Anvil Fork** | ✅ No gas cost<br>✅ Fast iteration<br>✅ Complete Base state | ❌ Needs local node<br>❌ Takes disk space | Development ⭐ |
| **3. Enhanced State Override** | ✅ No deployment<br>✅ No local node | ❌ May still fail<br>❌ Complex debugging | Research |
| **4. Mock Full Flow** | ✅ No dependencies<br>✅ Fast | ❌ Not realistic<br>❌ Limited coverage | Unit Tests |

---

## Solution 1: Deploy to Base Mainnet ⭐⭐⭐⭐⭐

### Prerequisites
- Wallet with at least 0.01 ETH on Base
- Private key for deployment

### Steps

#### 1. Set Environment Variables
```bash
export PRIVATE_KEY="your-private-key-here"
```

#### 2. Deploy TokenDoctor Contract
```bash
cd contracts
pnpm hardhat run scripts/deploy-doctor.ts --network base
```

Expected output:
```
✅ TokenDoctor deployed to: 0xYourContractAddress
```

#### 3. Configure Backend
Create `backend/.env`:
```env
RPC_URL="https://mainnet.base.org"
DOCTOR_ADDRESS_PLACEHOLDER="0xYourContractAddress"
SIMULATE_AMOUNT_ETH="0.1"
```

#### 4. Run Tests
```bash
cd backend
pnpm test        # All 14 unit tests pass
pnpm test:e2e    # All 7 E2E tests pass
```

### Advantages
- ✅ Most realistic environment
- ✅ Tests real Base network conditions
- ✅ Validates actual DeFi protocol interactions

### Disadvantages
- ❌ Costs approximately 0.005-0.01 ETH in gas
- ❌ Requires maintaining mainnet wallet
- ❌ Each deployment takes ~30 seconds

---

## Solution 2: Local Anvil Fork Node ⭐⭐⭐⭐⭐

### Prerequisites
- Install [Foundry](https://book.getfoundry.sh/getting-started/installation):
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```

### Steps

#### 1. Start Anvil Fork Node
```bash
# Fork Base mainnet to localhost
anvil --fork-url https://mainnet.base.org --port 8545
```

Keep this terminal running. You'll see:
```
Anvil running at http://127.0.0.1:8545
Available Accounts (with 10000 ETH each):
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
...
```

#### 2. Deploy Contract to Fork
Open a new terminal:
```bash
cd contracts
pnpm exec tsx scripts/deploy-doctor.ts
```

Expected output:
```
✅ TokenDoctor deployed to: 0x49b84Ac45785fD635Bf00d5ebaeBD75E4725EeE2
```

#### 3. Fund Test Account
The E2E tests require the sender account to have sufficient balance:
```bash
cd backend
node -e "
const {ethers} = require('ethers');
const provider = new ethers.JsonRpcProvider('http://localhost:8545');
const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
const sender = '0x5C7C4ce6EB0D638AF91C2726BFeA5F6A8ABB0a61';
wallet.sendTransaction({
  to: sender,
  value: ethers.parseEther('100')
}).then(tx => tx.wait()).then(() => console.log('✅ Transfer complete'));
"
```

#### 4. Verify Configuration
Ensure `backend/.env` contains:
```env
RPC_URL="http://localhost:8545"
DOCTOR_ADDRESS_PLACEHOLDER="0x49b84Ac45785fD635Bf00d5ebaeBD75E4725EeE2"
SIMULATE_AMOUNT_ETH="0.1"
```

#### 5. Run Tests
```bash
cd backend
pnpm test        # Unit tests: ✅ 14/14 pass
pnpm test:e2e    # E2E tests: ✅ 7/7 pass
```

### One-Line Test Script
```bash
# Stop old node
pkill -f "anvil.*8545" || true

# Start Anvil
nohup anvil --fork-url https://mainnet.base.org --port 8545 > /tmp/anvil-fork.log 2>&1 &
sleep 5

# Deploy contract
cd contracts && pnpm exec tsx scripts/deploy-doctor.ts

# Fund account
cd ../backend
node -e "const {ethers} = require('ethers'); const p = new ethers.JsonRpcProvider('http://localhost:8545'); const w = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', p); w.sendTransaction({to: '0x5C7C4ce6EB0D638AF91C2726BFeA5F6A8ABB0a61', value: ethers.parseEther('100')}).then(tx => tx.wait()).then(() => console.log('✅ Ready'));"

# Run tests
pnpm test && pnpm test:e2e
```

### For CI/CD
Create `.github/workflows/test.yml`:
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

## Solution 3: Enhanced State Override ⭐⭐

### Advantages
- ✅ No deployment needed
- ✅ No local node required

### Disadvantages
- ❌ May still fail with complex DeFi interactions
- ❌ Requires more debugging

### Implementation

Enhanced service created at: `backend/src/simulation/enhanced-simulation.service.ts`

Key improvements:
1. Set 100 ETH balance for Doctor contract
2. Set 1000 ETH balance for sender
3. Explicitly set 100M gas limit

Usage:
```typescript
import { EnhancedSimulationService } from './enhanced-simulation.service';

// Use in tests
const result = await enhancedService.simulateEnhanced(
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  true,
  3000
);
```

---

## Solution 4: Mock Full Flow ⭐⭐⭐

### Suitable for Fast Development and Unit Testing

Create mock provider to simulate RPC responses:

```typescript
// In tests
const mockProvider = {
  send: jest.fn().mockResolvedValue('0x...mocked-result')
};

// Test with mock
const service = new SimulationService(mockProvider);
const result = await service.simulate(tokenAddress);
```

### Advantages
- ✅ Extremely fast
- ✅ No external dependencies
- ✅ Fully controllable

### Disadvantages
- ❌ Doesn't test real contract interactions
- ❌ May miss edge cases

---

## 🎬 Quick Start (Recommended Flow)

### Local Development
```bash
# 1. Clone and install dependencies
pnpm install

# 2. Test with fork node
./scripts/test-with-fork.sh
```

### Production Deployment
```bash
# 1. Set environment variables
export PRIVATE_KEY="your-key"

# 2. Deploy to Base
./scripts/deploy-to-base.sh

# 3. Run tests
cd backend
pnpm test
```

---

## 🔧 Troubleshooting

### Issue 1: Fork Node Fails to Start
```bash
# Solution: Use different RPC endpoint
anvil --fork-url https://base.llamarpc.com --port 8545
```

### Issue 2: Insufficient Gas for Deployment
```bash
# Solution: Ensure wallet has at least 0.01 ETH
# Withdraw from CEX or use bridge
```

### Issue 3: Tests Still Fail
```bash
# Solution 1: Increase simulation amount
SIMULATE_AMOUNT_ETH="0.5"  # Increase to 0.5 ETH

# Solution 2: Use different test token
# Try tokens with more active liquidity pools
```

---

## 📚 Related Files

- `scripts/deploy-to-base.sh` - Mainnet deployment script
- `scripts/test-with-fork.sh` - Fork node test script
- `contracts/scripts/deploy-doctor.ts` - Deployment script
- `backend/src/simulation/enhanced-simulation.service.ts` - Enhanced service
- `backend/STATE_OVERRIDE_ANALYSIS.md` - State Override analysis

---

## 💡 Best Practice Recommendations

1. **Development Phase**: Use Solution 2 (Local Fork)
2. **CI/CD**: Use Solution 2 + GitHub Actions
3. **Production Environment**: Use Solution 1 (Real Deployment)
4. **Fast Iteration**: Use Solution 4 (Mock)

---

## ❓ FAQ

**Q: Why does State Override direct call fail?**
A: TokenDoctor contract needs to interact with real Uniswap routers. State Override only injections code but lacks necessary on-chain state (balances, approvals, liquidity, etc.).

**Q: Does local fork consume real ETH?**
A: No, fork nodes run entirely locally using simulated accounts and balances.

**Q: How much gas does Base mainnet deployment cost?**
A: Approximately 0.005-0.01 ETH, depending on network congestion.

**Q: Can I deploy to testnet?**
A: Base testnet (Sepolia) works, but liquidity pools may be incomplete. Mainnet fork is recommended.
