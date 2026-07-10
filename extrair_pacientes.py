"""
Extrai nome, telefone e ID de pacientes do arquivo HTML exportado do Simples Dental.
Salva o resultado em pacientes.csv

Padroes usados:
  - ID + Nome : data-testid="linkFichaPaciente{ID}" ... <span>NOME</span>
  - Telefone  : cdk-column-celular ... role="cell">TELEFONE</mat-cell>
"""

import re
import csv
from pathlib import Path

INPUT_FILE  = Path(__file__).parent / "pacientes.txt"
OUTPUT_FILE = Path(__file__).parent / "pacientes.csv"

# ──────────────────────────────────────────────
# Expressoes regulares
# ──────────────────────────────────────────────
PATTERN_NAME_ID = re.compile(
    r'data-testid="linkFichaPaciente(\d+)"[^>]*>'   # captura o ID
    r'(?:<img[^>]*>)?'                               # foto opcional
    r'<span[^>]*>(.*?)</span>',                      # captura o nome
    re.DOTALL
)

PATTERN_PHONE = re.compile(
    r'cdk-column-celular[^>]*role="cell">(.*?)</mat-cell>',
    re.DOTALL
)

# ──────────────────────────────────────────────
# Leitura
# ──────────────────────────────────────────────
print(f"Lendo {INPUT_FILE} ...")
html = INPUT_FILE.read_text(encoding="utf-8", errors="replace")

# ──────────────────────────────────────────────
# Extracao
# ──────────────────────────────────────────────
name_id_matches = PATTERN_NAME_ID.findall(html)
phone_matches   = PATTERN_PHONE.findall(html)

print(f"  IDs/Nomes encontrados : {len(name_id_matches)}")
print(f"  Telefones encontrados : {len(phone_matches)}")


def clean(s: str) -> str:
    return re.sub(r'\s+', ' ', s).strip()


records = []
for i, (pid, name) in enumerate(name_id_matches):
    phone = clean(phone_matches[i]) if i < len(phone_matches) else ""
    records.append({
        "id":       pid,
        "nome":     clean(name),
        "telefone": phone,
    })

# ──────────────────────────────────────────────
# Escrita do CSV (UTF-8 BOM para compatibilidade com Excel)
# ──────────────────────────────────────────────
with open(OUTPUT_FILE, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=["id", "nome", "telefone"])
    writer.writeheader()
    writer.writerows(records)

print(f"\n  {len(records)} pacientes salvos em {OUTPUT_FILE}")
