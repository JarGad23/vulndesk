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

Pierwszy administrator (hasło min. 12 znaków; `read -s` nie pokazuje go na ekranie ani w historii):

```sh
read -s ADMIN_PASSWORD && export ADMIN_PASSWORD
```

```sh
npm --prefix backend run build && ADMIN_EMAIL=admin@example.com npm --prefix backend run admin:create; unset ADMIN_PASSWORD
```

## Testy

Testy jednostkowe: `npm --prefix backend test`. Testy API wymagają uruchomionej bazy. Same tworzą i czyszczą osobną bazę `vulndesk_test`.

```sh
npm --prefix backend run test:e2e
```
