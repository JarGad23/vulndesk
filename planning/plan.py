"""Generate docs/estimation.md, or create GitHub issues with --create-issues OWNER/REPO."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ISSUES = json.loads((ROOT / "planning/issues.json").read_text())


def pert(i):
    return (i["o"] + 4 * i["m"] + i["p"]) / 6


def num(x):
    return f"{x:.1f}".replace(".", ",")


def estimation():
    total = sum(map(pert, ISSUES))
    sigma = sum(((i["p"] - i["o"]) / 6) ** 2 for i in ISSUES) ** 0.5
    rows = [
        f"| {n} | {i['stage']} | {i['title']} | {num(i['o'])} | {num(i['m'])} | {num(i['p'])} "
        f"| {num(pert(i))} | {'' if i['actual'] is None else num(i['actual'])} |"
        for n, i in enumerate(ISSUES, 1)
    ]
    stages = dict.fromkeys(i["stage"] for i in ISSUES)
    summary = [f"| {s} | {num(sum(pert(i) for i in ISSUES if i['stage'] == s))} |" for s in stages]
    return "\n".join([
        "# Estymacja pracochłonności", "",
        "Metoda: PERT, `E = (O + 4M + P) / 6`, gdzie O, M, P to czas optymistyczny, najbardziej",
        "prawdopodobny i pesymistyczny. Odchylenie zadania: `(P - O) / 6`. Wartości w godzinach.",
        "Szacunki z 2026-11-25, przed rozpoczęciem kodu. Czas rzeczywisty uzupełniany w trakcie pracy.", "",
        "| # | Etap | Zadanie | O | M | P | E | Rzeczywisty |", "|---|---|---|---|---|---|---|---|",
        *rows, "", "| Etap | E |", "|---|---|", *summary, "",
        f"**Razem: {num(total)} h**, odchylenie {num(sigma)} h. Przedział E ± 2σ: "
        f"{num(total - 2 * sigma)}–{num(total + 2 * sigma)} h",
        "(przy założeniu niezależnych zadań i rozkładu zbliżonego do normalnego).", "",
    ])


def create_issues(repo):
    existing = subprocess.run(
        ["gh", "issue", "list", "-R", repo, "--state", "all", "--limit", "500", "--json", "title"],
        check=True, capture_output=True, text=True).stdout
    titles = {i["title"] for i in json.loads(existing)}
    for i in ISSUES:
        if i["title"] in titles:
            continue
        done = "\n".join(f"- [ ] {d}" for d in i["done"])
        body = (f"**Etap:** {i['stage']}\n**Wymagania:** {', '.join(i['req']) or 'brak'}\n"
                f"**Estymata (PERT):** {num(pert(i))} h (O {num(i['o'])} / M {num(i['m'])} / P {num(i['p'])})\n\n"
                f"## Definicja ukończenia\n{done}\n")
        subprocess.run(["gh", "issue", "create", "-R", repo, "--title", i["title"], "--body", body], check=True)


if __name__ == "__main__":
    if sys.argv[1:2] == ["--create-issues"] and len(sys.argv) == 3:
        create_issues(sys.argv[2])
    elif len(sys.argv) == 1:
        (ROOT / "docs/estimation.md").write_text(estimation())
    else:
        sys.exit(__doc__)
