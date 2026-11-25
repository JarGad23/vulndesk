# VulnDesk: wymagania

VulnDesk zbiera podatności zgłoszone przez `npm audit` w projektach małego software house'u,
nadaje terminy naprawy i pilnuje ich obsługi.

## Aktorzy

- **Administrator**: zarządza użytkownikami i projektami, akceptuje ryzyko, ma też uprawnienia developera.
- **Developer**: importuje raporty i obsługuje podatności we wszystkich projektach.

## Wymagania funkcjonalne

| ID | Wymaganie | Kryterium akceptacji |
|---|---|---|
| F1 | Logowanie | poprawne dane otwierają aplikację; błędne dają jeden ogólny komunikat |
| F2 | Zarządzanie użytkownikami (admin) | admin dodaje konto, zmienia rolę i blokuje; zablokowany nie ma dostępu |
| F3 | Zarządzanie projektami (admin) | admin dodaje, edytuje i archiwizuje projekt; archiwum nie przyjmuje importów |
| F4 | Import raportu `npm audit --json` (v2) | poprawny plik zapisuje podatności i pokazuje liczbę nowych i pominiętych; błędny nie zmienia danych |
| F5 | Wykrywanie duplikatów | ponowny import tego samego pliku nie tworzy nowych wpisów |
| F6 | Termin naprawy (SLA) | liczony od wykrycia: critical 7, high 14, moderate 30, low 90 dni; info bez terminu |
| F7 | Lista podatności | filtry: projekt, ważność, status, po terminie; stronicowanie |
| F8 | Zmiana statusu | dozwolone tylko przejścia z tabeli poniżej |
| F9 | Historia zmian | import i każda zmiana statusu zapisują autora, czas oraz wartość przed i po |
| F10 | Dashboard | liczba otwartych według ważności i liczba po terminie |

Duplikat to ta sama para (pakiet, identyfikator advisory) w tym samym projekcie. Zamkniętą
podatność ponowny import otwiera jako `NEW` z nowym terminem; zaakceptowane ryzyko pozostaje bez zmian.

## Statusy

| Z | Do | Kto | Warunek |
|---|---|---|---|
| NEW | IN_PROGRESS | developer, administrator | brak |
| IN_PROGRESS | CLOSED | developer, administrator | brak |
| NEW, IN_PROGRESS | RISK_ACCEPTED | administrator | wymagane uzasadnienie |
| CLOSED | NEW | system | podatność wróciła w imporcie |
| RISK_ACCEPTED | NEW | administrator | cofnięcie akceptacji |

Otwarte są `NEW` i `IN_PROGRESS`; tylko one mogą być „po terminie”.

## Wymagania niefunkcjonalne

| ID | Wymaganie | Weryfikacja |
|---|---|---|
| N1 | Hasła hashowane Argon2id | przegląd kodu, test |
| N2 | Role sprawdzane na serwerze | testy API: 401 i 403 |
| N3 | Import do 2 MB, walidacja struktury, zapis w jednej transakcji | testy API |
| N4 | Limit prób logowania: 5 na minutę na IP | test API |
| N5 | Lista przy 1000 podatności: p95 odpowiedzi API < 500 ms lokalnie | pomiar |
| N6 | Obsługa klawiaturą, kontrast WCAG AA | Lighthouse, test ręczny |
| N7 | Logika domenowa: pokrycie testami co najmniej 80% linii | raport pokrycia w CI |
| N8 | Lokalna baza przez `docker compose up` | próba według README |

## Poza zakresem

Trivy, e-mail, integracje z issue trackerem, własny skaner, reset hasła.
