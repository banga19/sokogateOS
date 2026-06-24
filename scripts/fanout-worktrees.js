const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const WORKTREE_BASE = path.resolve(REPO_ROOT, '.worktrees');

const COMPONENTS = {
  core: {
    paths: ['src/agents', 'src/engine', 'src/middleware', 'src/utils', 'src/index.js'],
    agent: 'core',
    branchPrefix: 'worktree/core',
  },
  api: {
    paths: ['src/api', 'src/routes'],
    agent: 'backend-dev',
    branchPrefix: 'worktree/api',
  },
  services: {
    paths: ['src/services'],
    agent: 'backend-dev',
    branchPrefix: 'worktree/services',
  },
  models: {
    paths: ['src/models', 'src/data'],
    agent: 'data',
    branchPrefix: 'worktree/models',
  },
  abac: {
    paths: ['src/abac'],
    agent: 'security-architect',
    branchPrefix: 'worktree/abac',
  },
  ingestion: {
    paths: ['src/ingestion'],
    agent: 'data',
    branchPrefix: 'worktree/ingestion',
  },
  frontend: {
    paths: ['frontend'],
    agent: 'frontend-dev',
    branchPrefix: 'worktree/frontend',
  },
  config: {
    paths: ['config', 'src/config'],
    agent: 'devops',
    branchPrefix: 'worktree/config',
  },
  qme: {
    paths: ['src/qme'],
    agent: 'optimization',
    branchPrefix: 'worktree/qme',
  },
};

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', cwd: REPO_ROOT, stdio: 'pipe', ...opts }).trim();
}

function branchExists(name) {
  try {
    run(`git show-ref --verify --quiet refs/heads/${name}`);
    return true;
  } catch {
    return false;
  }
}

function worktreeExists(absPath) {
  return fs.existsSync(absPath);
}

function ensureBranch(name) {
  if (!branchExists(name)) {
    run(`git branch ${name} master`);
  }
  return name;
}

function createWorktree(component, config) {
  const branch = ensureBranch(config.branchPrefix);
  const targetDir = path.join(WORKTREE_BASE, component);

  if (worktreeExists(targetDir)) {
    return { component, branch, path: targetDir, status: 'exists' };
  }

  run(`git worktree add ${targetDir} ${branch}`);
  return { component, branch, path: targetDir, status: 'created' };
}

function pruneStaleWorktrees() {
  try {
    const output = run('git worktree prune');
    return output;
  } catch {
    return '';
  }
}

function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'status';

  fs.mkdirSync(WORKTREE_BASE, { recursive: true });

  if (action === 'create') {
    console.log(`Creating parallel worktrees at ${WORKTREE_BASE}...`);
    pruneStaleWorktrees();
    const manifest = { generatedAt: new Date().toISOString(), root: REPO_ROOT, worktreeBase: WORKTREE_BASE, components: {} };

    for (const [name, config] of Object.entries(COMPONENTS)) {
      const result = createWorktree(name, config);
      manifest.components[name] = result;
      console.log(`${result.status === 'created' ? '✓' : '−'} ${name}: ${result.path} (${result.branch})`);
    }

    fs.writeFileSync(path.join(WORKTREE_BASE, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`\nManifest written to ${path.join(WORKTREE_BASE, 'manifest.json')}`);
  } else if (action === 'remove') {
    console.log('Removing parallel worktrees...');
    pruneStaleWorktrees();
    const result = run(`git worktree list --porcelain`);
    const entries = result.split(/^worktree /m).filter(Boolean);
    for (const entry of entries) {
      const pathMatch = entry.match(/^ (.+)$/m);
      const branchMatch = entry.match(/^HEAD branch: (.+)$/m);
      if (pathMatch && branchMatch) {
        const wtPath = pathMatch[1].trim();
        const branch = branchMatch[1].trim();
        if (branch.startsWith('worktree/')) {
          run(`git worktree remove ${wtPath}`);
          console.log(`Removed: ${wtPath}`);
        }
      }
    }
  } else if (action === 'list') {
    const result = run('git worktree list');
    console.log(result);
  } else {
    console.log(`Worktree fan-out status\nRoot: ${REPO_ROOT}\nBase: ${WORKTREE_BASE}\n\nComponents:`);
    for (const [name, config] of Object.entries(COMPONENTS)) {
      const targetDir = path.join(WORKTREE_BASE, name);
      const status = worktreeExists(targetDir) ? 'present' : 'missing';
      console.log(`  ${name}: ${status} => ${targetDir} (agent: ${config.agent}, branch: ${config.branchPrefix})`);
    }
  }
}

main();
