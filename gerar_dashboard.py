"""
Gera dashboard.html v2 — injeta DADOS + EVOL + CONFIG
"""
import json
from pathlib import Path
from datetime import datetime

BASE          = Path(__file__).parent
ORC_FILE      = BASE / "orcamentos_abertos.json"
EVOL_FILE     = BASE / "evolucoes_resultado.json"
ORC_TRAT_FILE = BASE / "orcamentos_tratamentos.json"
CONFIG_FILE   = BASE / "config.json"
TEMPLATE_FILE = BASE / "dashboard_template.html"
OUTPUT_FILE   = BASE / "dashboard.html"

orc  = json.loads(ORC_FILE.read_text(encoding="utf-8"))
evol = json.loads(EVOL_FILE.read_text(encoding="utf-8")) if EVOL_FILE.exists() else {}
orc_trat = json.loads(ORC_TRAT_FILE.read_text(encoding="utf-8")) if ORC_TRAT_FILE.exists() else {"details": {}}

# Config — expõe somente campos seguros (mascara token)
cfg_raw = {}
if CONFIG_FILE.exists():
    cfg_raw = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))

tok = cfg_raw.get("token", "")
cfg_pub = {
    "token_masked": tok[:4] + "·"*(len(tok)-8) + tok[-4:] if len(tok) >= 8 else tok,
    "mensagem_template": cfg_raw.get("mensagem_template", ""),
    "wa_coords": cfg_raw.get("wa_coords", {"x": 0, "y": 0}),
    "intervalo_envio_s": cfg_raw.get("intervalo_envio_s", 3),
    "enviados": cfg_raw.get("enviados", []),
}

template = TEMPLATE_FILE.read_text(encoding="utf-8")
html = (template
        .replace("__DADOS_JSON__",  json.dumps(orc,     ensure_ascii=False))
        .replace("__EVOL_JSON__",   json.dumps(evol,    ensure_ascii=False))
    .replace("__ORC_TRAT_JSON__", json.dumps(orc_trat, ensure_ascii=False))
        .replace("__CONFIG_JSON__", json.dumps(cfg_pub, ensure_ascii=False)))

OUTPUT_FILE.write_text(html, encoding="utf-8")
print(f"[{datetime.now().strftime('%H:%M:%S')}] Dashboard gerado: {OUTPUT_FILE}")
print(f"  Orçamentos : {orc['total']} | R$ {orc['valor_total']:,.2f}")
if evol: print(f"  Evoluções  : {evol['total']} | Alta={evol['alta']} Média={evol['media']}")
print(f"  Enviados   : {len(cfg_pub['enviados'])}")
