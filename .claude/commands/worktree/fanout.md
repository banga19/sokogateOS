# Fan Out Agents Across Components in Parallel Worktrees

Distribute component ownership via isolated git worktrees for parallel agent execution.

## Usage

```bash
node scripts/fanout-worktrees.js <action>
```

## Actions

- `status` — Show worktree fan-out state
- `create` — Create all component worktrees
- `remove` — Remove component worktrees
- `list` — List all active worktrees

## Component Mapping

| Worktree | Branch | Agent | Paths |
|----------|--------|-------|-------|
| core | worktree/core | core-architect | src/agents, src/engine, src/middleware, src/utils |
| api | worktree/api | backend-dev | src/api, src/routes |
| services | worktree/services | backend-dev | src/services, src/qme |
| models | worktree/models | data | src/models, src/data |
| abac | worktree/abac | security-architect | src/abac |
| ingestion | worktree/ingestion | data | src/ingestion |
| frontend | worktree/frontend | frontend-dev | frontend |
| config | worktree/config | devops | config, src/config |
| qme | worktree/qme | optimization | src/qme |

## Integration Workflow

1. Agent operations in each worktree
2. Commit to `worktree/<component>` branch
3. Merge to master: `git checkout master && git merge worktree/<component> --no-ff`
4. Resolve conflicts in shared files
5. Run `npm test` and `npm run build`

## Coordination Manifest

Written to `.worktrees/coordination-manifest.json`.
