#!/usr/bin/env node

/**
 * Raveo — Interactive Setup Script
 *
 * Creates Cloudflare resources, generates wrangler.jsonc configs,
 * sets up environment variables, runs migrations and seeds demo content.
 *
 * Usage: node setup.mjs
 *
 * Requirements:
 *   - Node.js >= 20
 *   - pnpm >= 10
 *   - Wrangler CLI (pnpm add -g wrangler)
 *   - Authenticated with Cloudflare (wrangler login)
 */

import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Colors ──────────────────────────────────────────────────────────────────

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${c.cyan}ℹ${c.reset} ${msg}`),
  success: (msg) => console.log(`${c.green}✔${c.reset} ${msg}`),
  warn: (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`),
  error: (msg) => console.log(`${c.red}✖${c.reset} ${msg}`),
  step: (n, total, msg) =>
    console.log(`\n${c.bold}${c.blue}[${n}/${total}]${c.reset} ${c.bold}${msg}${c.reset}`),
  header: () => {
    console.log('');
    console.log(`${c.bold}${c.cyan}  ╔══════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}  ║         Raveo Setup Script           ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}  ╚══════════════════════════════════════╝${c.reset}`);
    console.log('');
  },
};

// ─── Readline helpers ────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultValue) {
  const suffix = defaultValue ? ` ${c.dim}(${defaultValue})${c.reset}` : '';
  return new Promise((resolve) => {
    rl.question(`${c.cyan}?${c.reset} ${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await ask(`${question} ${c.dim}(${hint})${c.reset}`);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith('y');
}

// ─── Shell helpers ───────────────────────────────────────────────────────────

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...options,
    }).trim();
  } catch (error) {
    if (options.ignoreError) return '';
    throw error;
  }
}

function execLive(cmd) {
  try {
    execSync(cmd, { encoding: 'utf-8', stdio: 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function _commandExists(cmd) {
  try {
    exec(`which ${cmd} 2>/dev/null || where ${cmd} 2>nul`);
    return true;
  } catch {
    return false;
  }
}

// ─── Prerequisite checks ────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

async function checkPrerequisites() {
  log.step(1, TOTAL_STEPS, 'Checking prerequisites');

  // Node.js
  const nodeVersion = exec('node --version').replace('v', '');
  const nodeMajor = parseInt(nodeVersion.split('.')[0], 10);
  if (nodeMajor < 20) {
    log.error(`Node.js >= 20 required, found ${nodeVersion}`);
    process.exit(1);
  }
  log.success(`Node.js ${nodeVersion}`);

  // pnpm
  try {
    const pnpmVersion = exec('pnpm --version');
    const pnpmMajor = parseInt(pnpmVersion.split('.')[0], 10);
    if (pnpmMajor < 10) {
      log.error(`pnpm >= 10 required, found ${pnpmVersion}`);
      process.exit(1);
    }
    log.success(`pnpm ${pnpmVersion}`);
  } catch {
    log.error('pnpm not found. Install: npm install -g pnpm');
    process.exit(1);
  }

  // Wrangler
  try {
    const wranglerVersion = exec('pnpm wrangler --version 2>/dev/null || wrangler --version');
    log.success(`Wrangler ${wranglerVersion}`);
  } catch {
    log.error('Wrangler not found. Install: pnpm add -g wrangler');
    process.exit(1);
  }

  // Wrangler auth check
  try {
    exec('pnpm wrangler whoami 2>/dev/null || wrangler whoami');
    log.success('Wrangler authenticated');
  } catch {
    log.warn('Not logged into Wrangler. Running wrangler login...');
    const ok = execLive('pnpm wrangler login || wrangler login');
    if (!ok) {
      log.error('Wrangler login failed. Run: wrangler login');
      process.exit(1);
    }
  }

  // Check we're in the monorepo root
  if (!existsSync(resolve(__dirname, 'turbo.json'))) {
    log.error('This script must be run from the monorepo root (where turbo.json is).');
    process.exit(1);
  }
  log.success('Running from monorepo root');
}

// ─── Cloudflare resource creation ────────────────────────────────────────────

/**
 * Lookup an existing KV namespace ID by title using `wrangler kv namespace list`.
 */
function lookupKvNamespaceId(title) {
  try {
    const output = exec(
      'pnpm wrangler kv namespace list 2>/dev/null || wrangler kv namespace list',
    );
    // wrangler outputs JSON array of { id, title, supports_url_encoding }
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const namespaces = JSON.parse(jsonMatch[0]);
      const found = namespaces.find((ns) => ns.title === title);
      return found?.id || '';
    }
  } catch {
    // Fallback — try to extract from non-JSON output
  }
  return '';
}

async function createCloudflareResources(projectName) {
  log.step(2, TOTAL_STEPS, 'Creating Cloudflare resources');

  const resources = { d1Id: '', d1Name: '', r2Name: '', kvId: '' };

  // D1 Database
  const d1Name = await ask('D1 database name', `${projectName}-cms`);
  log.info(`Creating D1 database: ${d1Name}...`);
  try {
    const output = exec(
      `pnpm wrangler d1 create ${d1Name} 2>&1 || wrangler d1 create ${d1Name} 2>&1`,
    );
    const idMatch =
      output.match(/database_id\s*[:=]\s*"?([a-f0-9-]+)"?/i) ||
      output.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
    if (idMatch) {
      resources.d1Id = idMatch[1];
      resources.d1Name = d1Name;
      log.success(`D1 created: ${d1Name} (${resources.d1Id})`);
    } else {
      log.warn('Could not parse D1 database ID from output:');
      console.log(output);
      resources.d1Id = await ask('Please paste the D1 database ID manually');
      resources.d1Name = d1Name;
    }
  } catch (error) {
    const errorStr = `${error.message || ''} ${error.stderr || ''} ${error.stdout || ''}`;
    if (errorStr.includes('already exists')) {
      log.warn(`D1 database "${d1Name}" already exists.`);
      resources.d1Id = await ask('Paste existing D1 database ID');
      resources.d1Name = d1Name;
    } else {
      log.error(`Failed to create D1: ${error.message}`);
      resources.d1Id = await ask('Paste D1 database ID manually (or leave empty to skip)');
      resources.d1Name = d1Name;
    }
  }

  // R2 Bucket
  const r2Name = await ask('R2 bucket name', `${projectName}-cms-r2`);
  log.info(`Creating R2 bucket: ${r2Name}...`);
  try {
    exec(
      `pnpm wrangler r2 bucket create ${r2Name} 2>&1 || wrangler r2 bucket create ${r2Name} 2>&1`,
    );
    resources.r2Name = r2Name;
    log.success(`R2 created: ${r2Name}`);
  } catch (error) {
    if (error.message?.includes('already exists') || error.stderr?.includes('already exists')) {
      log.warn(`R2 bucket "${r2Name}" already exists — using it.`);
      resources.r2Name = r2Name;
    } else {
      log.error(`Failed to create R2: ${error.message}`);
      resources.r2Name = r2Name;
    }
  }

  // KV Namespace
  const kvTitle = await ask('KV namespace title', `${projectName}-cache`);
  log.info(`Creating KV namespace: ${kvTitle}...`);
  try {
    const output = exec(
      `pnpm wrangler kv namespace create ${kvTitle} 2>&1 || wrangler kv namespace create ${kvTitle} 2>&1`,
    );
    const idMatch = output.match(/id\s*[:=]\s*"?([a-f0-9]+)"?/i) || output.match(/([a-f0-9]{32})/);
    if (idMatch) {
      resources.kvId = idMatch[1];
      log.success(`KV created: ${kvTitle} (${resources.kvId})`);
    } else {
      log.warn('Could not parse KV namespace ID from output:');
      console.log(output);
      resources.kvId = await ask('Please paste the KV namespace ID manually');
    }
  } catch (error) {
    const errorStr = `${error.message || ''} ${error.stderr || ''} ${error.stdout || ''}`;
    if (errorStr.includes('already exists')) {
      log.warn(`KV namespace "${kvTitle}" already exists — looking up ID...`);
      resources.kvId = lookupKvNamespaceId(kvTitle);
      if (resources.kvId) {
        log.success(`Found existing KV: ${kvTitle} (${resources.kvId})`);
      } else {
        resources.kvId = await ask('Could not auto-detect ID. Paste existing KV namespace ID');
      }
    } else {
      log.error(`Failed to create KV: ${error.message}`);
      resources.kvId = await ask('Paste KV namespace ID manually (or leave empty to skip)');
    }
  }

  return resources;
}

// ─── Generate wrangler.jsonc files ───────────────────────────────────────────

function generateWranglerConfigs(projectName, resources) {
  log.step(3, TOTAL_STEPS, 'Generating wrangler.jsonc configs');

  const cmsWorkerName = `${projectName}-cms`;
  const webWorkerName = `${projectName}-web`;

  // CMS wrangler.jsonc
  const cmsConfig = {
    $schema: 'node_modules/wrangler/config-schema.json',
    main: '.open-next/worker.js',
    name: cmsWorkerName,
    compatibility_date: '2025-08-15',
    compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
    assets: {
      directory: '.open-next/assets',
      binding: 'ASSETS',
    },
    d1_databases: [
      {
        binding: 'D1',
        database_id: resources.d1Id || 'YOUR_D1_DATABASE_ID',
        database_name: resources.d1Name || 'YOUR_D1_DATABASE_NAME',
        remote: true,
      },
    ],
    services: [],
    r2_buckets: [
      {
        binding: 'R2',
        bucket_name: resources.r2Name || 'YOUR_R2_BUCKET_NAME',
      },
    ],
  };

  const cmsPath = resolve(__dirname, 'apps/cms/wrangler.jsonc');
  if (existsSync(cmsPath)) {
    log.warn('apps/cms/wrangler.jsonc already exists — backing up to wrangler.jsonc.bak');
    writeFileSync(`${cmsPath}.bak`, readFileSync(cmsPath, 'utf-8'));
  }
  writeFileSync(cmsPath, `${JSON.stringify(cmsConfig, null, 2)}\n`);
  log.success(`apps/cms/wrangler.jsonc → worker: ${cmsWorkerName}`);

  // Web wrangler.jsonc
  const webConfig = {
    $schema: 'node_modules/wrangler/config-schema.json',
    name: webWorkerName,
    compatibility_date: '2026-02-27',
    compatibility_flags: ['nodejs_compat'],
    assets: {
      directory: './dist',
    },
    kv_namespaces: [
      {
        binding: 'CACHE',
        id: resources.kvId || 'YOUR_KV_NAMESPACE_ID',
      },
    ],
    services: [
      {
        binding: 'CMS',
        service: cmsWorkerName,
      },
    ],
  };

  const webPath = resolve(__dirname, 'apps/web/wrangler.jsonc');
  if (existsSync(webPath)) {
    log.warn('apps/web/wrangler.jsonc already exists — backing up to wrangler.jsonc.bak');
    writeFileSync(`${webPath}.bak`, readFileSync(webPath, 'utf-8'));
  }
  writeFileSync(webPath, `${JSON.stringify(webConfig, null, 2)}\n`);
  log.success(`apps/web/wrangler.jsonc → worker: ${webWorkerName}`);

  return { cmsWorkerName, webWorkerName };
}

// ─── Generate environment files ──────────────────────────────────────────────

function generateEnvFiles() {
  log.step(4, TOTAL_STEPS, 'Setting up environment variables');

  // CMS .dev.vars
  const cmsEnvPath = resolve(__dirname, 'apps/cms/.dev.vars');
  if (existsSync(cmsEnvPath)) {
    log.warn('apps/cms/.dev.vars already exists — skipping');
  } else {
    const secret = randomBytes(32).toString('hex');
    writeFileSync(cmsEnvPath, `PAYLOAD_SECRET=${secret}\n`);
    log.success('apps/cms/.dev.vars created with random PAYLOAD_SECRET');
  }

  // Web .env.local
  const webEnvPath = resolve(__dirname, 'apps/web/.env.local');
  if (existsSync(webEnvPath)) {
    log.warn('apps/web/.env.local already exists — skipping');
  } else {
    writeFileSync(webEnvPath, 'CMS_URL=http://localhost:3000\n');
    log.success('apps/web/.env.local created (CMS_URL=http://localhost:3000)');
  }
}

// ─── Install dependencies ────────────────────────────────────────────────────

async function installDependencies() {
  log.step(5, TOTAL_STEPS, 'Installing dependencies');

  if (existsSync(resolve(__dirname, 'node_modules'))) {
    log.info('node_modules already exists — running pnpm install to sync...');
  }

  const ok = execLive('pnpm install');
  if (!ok) {
    log.error('pnpm install failed');
    process.exit(1);
  }
  log.success('Dependencies installed');
}

// ─── Run migrations ─────────────────────────────────────────────────────────

async function runMigrations() {
  log.step(6, TOTAL_STEPS, 'Running database migrations');

  log.info('Running Payload CMS migrations...');
  const ok = execLive('pnpm --filter @raveo/cms payload migrate');
  if (!ok) {
    log.warn('Migrations failed — you can run them manually later:');
    log.info('  pnpm --filter @raveo/cms payload migrate');
    return false;
  }
  log.success('Migrations complete');
  return true;
}

// ─── Seed data ──────────────────────────────────────────────────────────────

async function seedData() {
  log.step(7, TOTAL_STEPS, 'Seeding demo content');

  const shouldSeed = await confirm('Seed demo content (admin user, sample pages & posts)?');
  if (!shouldSeed) {
    log.info('Skipping seed — you can run it later: pnpm --filter @raveo/cms seed');
    return;
  }

  const ok = execLive('pnpm --filter @raveo/cms seed');
  if (!ok) {
    log.warn('Seed failed — you can run it manually later:');
    log.info('  pnpm --filter @raveo/cms seed');
    return;
  }
  log.success('Demo content seeded');
}

// ─── Summary ─────────────────────────────────────────────────────────────────

function printSummary(_workers) {
  console.log('');
  console.log(`${c.bold}${c.green}  ╔══════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.green}  ║          Setup Complete! 🎉          ║${c.reset}`);
  console.log(`${c.bold}${c.green}  ╚══════════════════════════════════════╝${c.reset}`);
  console.log('');
  console.log(`  ${c.bold}Start developing:${c.reset}`);
  console.log(
    `  ${c.dim}$${c.reset} pnpm --filter @raveo/cms dev  ${c.dim}→ CMS at http://localhost:3000${c.reset}`,
  );
  console.log(
    `  ${c.dim}$${c.reset} pnpm --filter @raveo/web dev  ${c.dim}→ Web at http://localhost:4321${c.reset}`,
  );
  console.log('');
  console.log(`  ${c.bold}Admin panel:${c.reset} http://localhost:3000/admin`);
  console.log(`  ${c.bold}Default login:${c.reset} admin@example.com / password`);
  console.log(`  ${c.dim}(Change immediately after first login)${c.reset}`);
  console.log('');
  console.log(`  ${c.bold}Deploy:${c.reset}`);
  console.log(`  ${c.dim}$${c.reset} pnpm deploy:cms  ${c.dim}→ deploys CMS worker${c.reset}`);
  console.log(`  ${c.dim}$${c.reset} pnpm deploy:web  ${c.dim}→ deploys Web worker${c.reset}`);
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log.header();

  try {
    await checkPrerequisites();

    const projectName = await ask('Project name (used for CF resource naming)', 'raveo');

    const resources = await createCloudflareResources(projectName);
    const workers = generateWranglerConfigs(projectName, resources);
    generateEnvFiles();
    await installDependencies();

    const migrationsOk = await runMigrations();
    if (migrationsOk) {
      await seedData();
    }

    printSummary(workers);
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
