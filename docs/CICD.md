# CI/CD Configuration Guide

## 📋 Overview

This project uses GitHub Actions for continuous integration and quality assurance. The CI/CD pipeline includes:

- **CI Pipeline**: Linting, testing, and building
- **Build Pipeline**: Build verification
- **Release Pipeline**: Version management and release packaging

## 🚀 Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Triggered on:
- Push to `master`, `main`, or `develop` branches
- Pull requests to these branches

**Steps:**
- Code checkout
- Install pnpm and Node.js
- Install Foundry (for Anvil fork testing)
- Lint backend and frontend
- Build and test smart contracts
- Start Anvil fork with mainnet state
- Run backend unit tests
- Run E2E tests
- Build frontend and backend for verification

### 2. Build Workflow (`.github/workflows/deploy.yml`)

Triggered on:
- Push to `master` or `main` branch
- Manual trigger via GitHub UI
- Git tags starting with `v*`

**Features:**
- Builds frontend with production settings for verification
- Validates production build configuration

### 3. Release Workflow (`.github/workflows/release.yml`)

Triggered on:
- Git tags matching `v*.*.*` (semantic versioning)

**Features:**
- Creates release archives for all packages
- Generates changelog from git commits
- Creates GitHub release with artifacts

## ⚙️ Setup Instructions

### 1. Enable GitHub Actions

1. Go to repository Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Set "Workflow permissions" to "Read and write permissions"

### 2. Configure Secrets

Go to Settings → Secrets and variables → Actions, add:

**Required:**
- `MAINNET_RPC_URL`: Ethereum mainnet RPC endpoint (e.g., Alchemy, Infura)

**Optional:**
- `VITE_API_URL`: Backend API URL for production (default: http://localhost:3000)

### 3. Protect Branches

Recommended branch protection rules for `master`:

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `master`
3. Enable:
   - ✅ Require pull request reviews before merging
   - ✅ Require status checks to pass before merging
     - Select: `Lint and Test`, `E2E Tests`
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

## 📦 Creating a Release

1. Update version in `package.json` files
2. Commit changes: `git commit -am "chore: bump version to x.y.z"`
3. Create and push tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. GitHub Actions will automatically:
   - Build all packages
   - Create release archives
   - Generate changelog
   - Publish GitHub release

## 🔄 Manual Build

Trigger manual build verification via GitHub UI:

1. Go to Actions tab
2. Select "Deploy" workflow
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow" button

## 📊 Status Badges

Add to your README.md:

```markdown
![CI](https://github.com/huicanvie/chuizi-token-doctor/workflows/CI/badge.svg)
![Deploy](https://github.com/huicanvie/chuizi-token-doctor/workflows/Deploy/badge.svg)
```

## 🐛 Troubleshooting

### Anvil fork fails
- Check `MAINNET_RPC_URL` secret is set correctly
- Verify RPC endpoint is accessible
- Check fork block number is not too recent

### Frontend build fails
- Check `VITE_API_URL` if using custom backend
- Ensure build succeeds locally first
- Verify all dependencies are properly installed

### Tests fail in CI but pass locally
- Check environment variables
- Verify all dependencies in `package.json`
- Review Anvil fork connection settings

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Foundry Book](https://book.getfoundry.sh/)
- [pnpm Documentation](https://pnpm.io/)
