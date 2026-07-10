"""
Atualiza detalhes de tratamentos dos orcamentos em aberto.

Fluxo:
1) Le orcamentos_abertos.json
2) Para cada paciente, consulta /pacientes/{id}/orcamentos
3) Seleciona o orcamento mais aderente a data/valor da base local
4) Consulta /orcamentos/{id}/procedimentos?idPaciente={id}
5) Salva cache local em orcamentos_tratamentos.json
"""

import json
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent
ORC_FILE = BASE / "orcamentos_abertos.json"
CFG_FILE = BASE / "config.json"
OUT_FILE = BASE / "orcamentos_tratamentos.json"


def to_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default


def parse_br_date(s):
    try:
        return datetime.strptime(str(s or ""), "%d/%m/%Y").date()
    except Exception:
        return None


def parse_iso_date(s):
    try:
        txt = str(s or "")
        if txt.endswith("Z"):
            txt = txt[:-1] + "+00:00"
        return datetime.fromisoformat(txt).date()
    except Exception:
        return None


def row_key(row):
    rid = str(row.get("id") or "").strip()
    data = str(row.get("data") or "").strip()
    valor = to_float(row.get("valor"), 0.0)
    return f"{rid}|{data}|{valor:.2f}"


def api_get(url, token):
    req = urllib.request.Request(url, headers={
        "x-auth-token": token,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://app.simplesdental.com",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def escolher_orcamento(content, data_ref_br, valor_ref):
    data_ref = parse_br_date(data_ref_br)
    melhor = None
    melhor_key = None
    for o in content or []:
        status = str(o.get("status") or "")
        rank_status = 0 if status == "EM_ABERTO" else 1 if status == "APROVADO" else 2
        d = parse_iso_date(o.get("data"))
        diff_data = abs((d - data_ref).days) if (d and data_ref) else 9999
        diff_val = abs(to_float(o.get("valorTotal"), 0.0) - to_float(valor_ref, 0.0))
        key = (rank_status, diff_data, diff_val)
        if melhor is None or key < melhor_key:
            melhor = o
            melhor_key = key
    return melhor


def main():
    if not ORC_FILE.exists():
        raise SystemExit("orcamentos_abertos.json não encontrado")
    if not CFG_FILE.exists():
        raise SystemExit("config.json não encontrado")

    orc = json.loads(ORC_FILE.read_text(encoding="utf-8"))
    cfg = json.loads(CFG_FILE.read_text(encoding="utf-8"))
    token = str(cfg.get("token") or "").strip()
    if not token:
        raise SystemExit("Token ausente no config.json")

    rows = [r for r in (orc.get("lista") or []) if str(r.get("id") or "").strip()]
    total = len(rows)
    print(f"Total orçamentos na base : {total}")

    by_pid = {}
    for r in rows:
        by_pid.setdefault(str(r.get("id")).strip(), []).append(r)

    patient_orcs = {}
    proc_cache = {}
    details = {}
    synced = 0
    erros = 0

    idx = 0
    for pid, pid_rows in by_pid.items():
        idx += 1
        try:
            url_orc = f"https://api.simplesdental.com/pacientes/{pid}/orcamentos?pageNumber=1&pageSize=30"
            data_orc = api_get(url_orc, token)
            patient_orcs[pid] = data_orc.get("content") or []
        except Exception as e:
            print(f"[{idx}/{len(by_pid)}] ERRO paciente {pid}: {e}")
            for row in pid_rows:
                details[row_key(row)] = {"ok": False, "msg": f"Falha ao buscar orçamentos do paciente: {e}", "tratamentos": [], "total": 0}
                erros += 1
            continue

        for row in pid_rows:
            try:
                best = escolher_orcamento(patient_orcs[pid], row.get("data"), row.get("valor"))
                if not best:
                    details[row_key(row)] = {"ok": True, "msg": "Orçamento não localizado", "tratamentos": [], "total": 0}
                    continue

                orc_id = int(best.get("id") or 0)
                if orc_id not in proc_cache:
                    url_proc = f"https://api.simplesdental.com/orcamentos/{orc_id}/procedimentos?idPaciente={pid}&pageNumber=1"
                    data_proc = api_get(url_proc, token)
                    proc_cache[orc_id] = data_proc.get("content") or []

                tratamentos = []
                for item in proc_cache[orc_id]:
                    p = item.get("procedimento") or {}
                    nome = str(p.get("nome") or p.get("nomeTuss") or "").strip()
                    if not nome:
                        continue
                    tratamentos.append({"nome": nome, "valor": to_float(item.get("valor"), 0.0)})

                details[row_key(row)] = {
                    "ok": True,
                    "orcamento_id": orc_id,
                    "descricao": best.get("descricao") or "",
                    "status": best.get("status") or "",
                    "data": best.get("data") or "",
                    "valor": to_float(best.get("valorTotal"), 0.0),
                    "tratamentos": tratamentos,
                    "total": len(tratamentos),
                }
                synced += 1
            except Exception as e:
                details[row_key(row)] = {"ok": False, "msg": f"Falha ao buscar tratamentos: {e}", "tratamentos": [], "total": 0}
                erros += 1

    out = {
        "updated_at": datetime.now().isoformat(),
        "source_total": total,
        "sincronizados": synced,
        "erros": erros,
        "details": details,
    }
    OUT_FILE.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Sincronizados : {synced}")
    print(f"Erros         : {erros}")
    print(f"Arquivo salvo : {OUT_FILE}")


if __name__ == "__main__":
    main()
