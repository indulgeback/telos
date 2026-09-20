# Independent Agent Worker

The API entrypoint (`src/index.ts`) owns HTTP, SSE and realtime voice. The worker
entrypoint (`src/worker.ts`) owns BullMQ execution, lease recovery and Outbox
dispatch. Both use the existing agent-service image. Only the API registers with
Registry/Consul. No database schema change is needed for the process split.

## Development

Run `pnpm agent-service:dev` and `pnpm agent-worker:dev` in separate terminals,
with the same database, Redis and workspace configuration. The API listens on
8895; the worker exposes only `/health` and `/ready` on 8896. Docker Compose starts
both automatically. A healthy API can accept queued work while workers restart;
API readiness checks the database and queue, not a local worker.

## Production

Compose adds `agent-worker`, reusing the agent-service image and configuration.
API and worker share `/opt/telos/workspaces` through `WORKSPACE_PERSISTED_DIR`.
COS remains supported; the shared local directory is the fallback store.

The deployment script stops the API and all workers before migration. On the
first split release it copies the old container's `/app/.persisted-workspaces`
into the shared directory and writes a migration marker. A nonempty unmarked
store aborts deployment instead of silently merging unrelated files. Keep this
directory in host backups. This is single-host storage, not cross-host scaling.

The previous six image rollback points remain sufficient because API and worker
share an image. Health checks include every worker replica. Migration failures
restart old worker containers; release rollback uses the previous manifest,
including manifests that predate the worker service. Legacy local workspace
files are copied back when recovering an old manifest without shared storage.

Worker SIGTERM stops accepting jobs and drains in-flight execution while keeping
Outbox available, then drains Outbox before disconnecting the database. The
default worker drain timeout is 120 seconds; Compose allows 150 seconds. If you
increase `WORKER_SHUTDOWN_TIMEOUT_MS`, also increase `WORKER_STOP_GRACE_PERIOD`.
Timeouts leave recovery to the existing lease/snapshot policy: this does not
promise replay of arbitrary external side effects or zero-interruption releases.

For independent operation, load the production environment as deploy.sh does,
then use Compose to restart only `agent-service` or scale `agent-worker` (it has
no fixed container name or published health port). The existing automated release
still updates the full application; independent deployment selection is not added.

## Validation

`pnpm --filter ./services/agent-service test` runs unit tests. Opt-in process tests
require explicitly isolated `TELOS_PROCESS_TEST_DATABASE_URL` (database name must
contain `telos_worker_test`) and `TELOS_PROCESS_TEST_REDIS_URL`. Never point these
at production. Create the schema in an empty test database before running them.
