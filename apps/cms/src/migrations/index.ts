import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260227_141438 from './20260227_141438';
import * as migration_20260227_205333 from './20260227_205333';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260227_141438.up,
    down: migration_20260227_141438.down,
    name: '20260227_141438',
  },
  {
    up: migration_20260227_205333.up,
    down: migration_20260227_205333.down,
    name: '20260227_205333'
  },
];
