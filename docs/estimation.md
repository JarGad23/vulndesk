# Estymacja pracochłonności

Metoda: PERT, `E = (O + 4M + P) / 6`, gdzie O, M, P to czas optymistyczny, najbardziej
prawdopodobny i pesymistyczny. Odchylenie zadania: `(P - O) / 6`. Wartości w godzinach.
Szacunki z 2026-11-25, przed rozpoczęciem kodu. Czas rzeczywisty uzupełniany w trakcie pracy.

| # | Etap | Zadanie | O | M | P | E | Rzeczywisty |
|---|---|---|---|---|---|---|---|
| 1 | Przygotowanie | Repozytorium, szkielet aplikacji i lokalna baza | 1,0 | 2,0 | 4,0 | 2,2 |  |
| 2 | Przygotowanie | Model danych i diagramy | 2,0 | 3,0 | 5,0 | 3,2 |  |
| 3 | Backend | API: logowanie, role i użytkownicy | 2,0 | 3,0 | 6,0 | 3,3 |  |
| 4 | Backend | API: projekty | 0,5 | 1,0 | 2,0 | 1,1 |  |
| 5 | Backend | API: import npm audit i duplikaty | 2,0 | 3,0 | 6,0 | 3,3 |  |
| 6 | Backend | API: statusy, SLA i historia | 1,5 | 2,5 | 4,0 | 2,6 |  |
| 7 | Backend | API: lista i dashboard | 1,0 | 1,5 | 3,0 | 1,7 |  |
| 8 | Frontend | UI: logowanie, układ, użytkownicy i projekty | 2,0 | 3,0 | 5,0 | 3,2 |  |
| 9 | Frontend | UI: import, lista i szczegóły podatności | 2,5 | 4,0 | 7,0 | 4,2 |  |
| 10 | Frontend | UI: dashboard | 0,5 | 1,5 | 3,0 | 1,6 |  |
| 11 | Wydanie | CI i test E2E głównej ścieżki | 1,0 | 2,0 | 4,0 | 2,2 |  |
| 12 | Wydanie | Wdrożenie demonstracyjne | 1,0 | 1,5 | 4,0 | 1,8 |  |
| 13 | Wydanie | Dokumentacja końcowa PDF | 3,0 | 4,0 | 6,0 | 4,2 |  |

| Etap | E |
|---|---|
| Przygotowanie | 5,3 |
| Backend | 12,0 |
| Frontend | 9,0 |
| Wydanie | 8,2 |

**Razem: 34,5 h**, odchylenie 1,9 h. Przedział E ± 2σ: 30,8–38,2 h
(przy założeniu niezależnych zadań i rozkładu zbliżonego do normalnego).
