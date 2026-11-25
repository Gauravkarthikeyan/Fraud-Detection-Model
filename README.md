# FinShield

FinShield is a browser-based fraud-detection demonstration. A small 3D city
represents four banks, while synthetic transactions move between them. The
browser simulation can inject fraud patterns and score transactions locally.

The Model Lab includes a separate backend experiment. Four bank processes train
on separate synthetic datasets; a FastAPI coordinator aggregates model weights
and records run metrics in MongoDB. No customer records are used.

## Run locally

### Requirements

- macOS with Homebrew
- Python 3
- Node.js with `npx`
- MongoDB Community Edition

The startup script uses `npx` to fetch Yarn 1.22.22 when it needs to install
frontend dependencies.

Install MongoDB if needed:

```sh
brew tap mongodb/brew
brew install mongodb-community
```

From the repository root:

```sh
./start-project
```

Open [http://localhost:3000](http://localhost:3000). The script starts MongoDB
through `brew services`, the API on port `8001`, four bank clients on ports
`8101` to `8104`, and the frontend on port `3000`. Press Ctrl+C to stop the
application processes. MongoDB remains managed by `brew services`.


The startup script installs backend dependencies each time it runs. It installs
frontend dependencies only when `frontend/node_modules` is missing.

## What runs

The browser simulation and its first four Model Lab tabs run without the
federated-learning backend. The fifth tab, **Live backend**, calls the API and
bank client processes.

Each bank generates its own seeded, synthetic dataset with a different
distribution. During a training run, the coordinator sends the current model
weights to online clients. Each client trains locally and returns updated
weights, not its rows. The coordinator combines those updates with
sample-weighted FedAvg or FedProx, evaluates the resulting model, and stores
round metrics in MongoDB. Optional differential privacy clips and adds noise
to client updates.

These are implementation details of this demonstration, not a privacy
guarantee for other datasets or deployments.

## Backend API

The federated-learning routes live under `/api/fl`:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/clients` | Report which bank clients are online |
| `POST` | `/runs` | Start a training run |
| `GET` | `/runs` | List recent runs |
| `GET` | `/runs/{run_id}` | Read run and per-round metrics |
| `POST` | `/score` | Score seven features with the latest completed model |

The backend accepts one active run at a time. A run cannot start without an
online client, and scoring is unavailable until a run has completed. See
`backend/fl/api.py` and `backend/fl/coordinator.py` for request fields and
response shapes.

## Project layout

- `frontend/src/sim/` contains transaction generation, fraud injection, model
  scoring, and simulation state.
- `frontend/src/scene/` renders the city and its transaction signals with
  React Three Fiber.
- `frontend/src/ui/lab/` contains the Model Lab, including the live backend tab.
- `backend/fl/` contains synthetic data generation, local training, aggregation,
  metrics, clients, and the coordinator.
- `backend/tests/` tests the federated-learning backend without MongoDB or
  listening ports.

## Run the backend tests

```sh
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pytest
```

The tests use an in-memory run repository and mocked HTTP transport. They do
not require MongoDB or running bank clients.
