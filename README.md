# VulnDesk

Rejestr podatności dla małego software house'u: import raportów `npm audit`, terminy naprawy i obsługa statusów.

Projekt studencki. [Wymagania](docs/requirements.md) · [Estymacja](docs/estimation.md) · [Diagramy](docs/diagrams.md)

## Uruchomienie lokalne

Wymagane: Node.js 24+ i Docker.

```sh
docker compose up -d --wait
npm --prefix backend install
npm --prefix frontend install
npm --prefix backend run db:deploy
```

W dwóch terminalach:

```sh
npm --prefix backend run start:dev
```

```sh
npm --prefix frontend run dev
```

Aplikacja: http://localhost:3000, API: http://localhost:3001/api/health.
Dane dostępowe w `docker-compose.yml` służą wyłącznie lokalnej bazie.
