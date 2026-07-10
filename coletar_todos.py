"""
Coleta evolucoes de TODOS os pacientes (não só os com orçamento em aberto).
Salva em evolucoes_todos_resultado.json
"""
import urllib.request, urllib.error
import json, time, openpyxl, unicodedata, re
from pathlib import Path
from datetime import datetime, timezone
import sys

TOKEN = "QbDYIw4sWwebEvSjFEylCPHbCIDez9rIdxqx24vTt3Kv92VSA6rrDRStW6COH1Y4"
BASE           = Path(__file__).parent
EXCEL_FILE     = BASE / "aca.xlsx"
CACHE_FILE     = BASE / "evolucoes_todos_cache.json"
KEYWORDS       = ["limpeza", "profilaxia"]
DELAY          = 0.3

HEADERS = {
    "x-auth-token": TOKEN,
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Origin": "https://app.simplesdental.com",
}

def api_get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 404: return None
        raise
    except Exception as e:
        print(f"ERRO {url}: {e}")
        return None

def html_to_text(html):
    text = re.sub(r'<[^>]+>', ' ', str(html or ''))
    text = re.sub(r'&[a-z]+;', ' ', text)
    return re.sub(r'\s+', ' ', text).strip().lower()

def norm(s):
    if not s: return ''
    s = unicodedata.normalize('NFKD', str(s))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'\s+', ' ', s.lower().strip())

def dias_atras(data_str):
    try:
        dt = datetime.fromisoformat(data_str.replace('Z', '+00:00'))
        return (datetime.now(timezone.utc) - dt).days
    except:
        return 9999

print("Lendo aca.xlsx ...")
wb = openpyxl.load_workbook(EXCEL_FILE)
ws_pac = wb['Listagem_pacientes']
ws_orc = wb['Relatorio_orcamentos_por_status']

# Todos os pacientes
todos = {}
for row in ws_pac.iter_rows(min_row=2, values_only=True):
    nome = norm(row[0])
    pid  = str(row[5] or '').strip()
    cel  = str(row[4] or '').strip()
    if pid:
        todos[pid] = {'nome': str(row[0] or ''), 'celular': cel, 'id': pid,
                      'valor_orcamento': 0.0, 'data_orcamento': ''}

# Enriquece com orçamentos em aberto
for row in ws_orc.iter_rows(min_row=2, values_only=True):
    data, nome, doc, cel, email, cel_resp, desc, status, valor = row
    if str(status or '').strip() != 'Em aberto': continue
    nome_norm = norm(nome)
    for pid, p in todos.items():
        if norm(p['nome']) == nome_norm:
            p['valor_orcamento'] = max(p['valor_orcamento'], float(valor or 0))
            p['data_orcamento']  = str(data or '')
            break

print(f"  {len(todos)} pacientes no total")

cache = {}
if CACHE_FILE.exists():
    cache = json.loads(CACHE_FILE.read_text(encoding='utf-8'))
    print(f"  Cache: {len(cache)} ja coletados")

total = len(todos)
erros = 0

for idx, (pid, info) in enumerate(todos.items(), 1):
    if pid in cache:
        continue

    url = f"https://api.simplesdental.com/pacientes/{pid}/evolucoes?pageSize=50&pageNumber=1&verHtml=true"
    data = api_get(url)

    if data is None:
        erros += 1
        cache[pid] = {**info, 'evolucoes': [], 'erro': True}
        continue

    evolucoes = data.get('content', [])
    ultima_limpeza_data  = None
    ultima_limpeza_dias  = None
    ultima_evolucao_data = None
    ultima_evolucao_dias = None
    ultimo_proc          = ''

    for ev in evolucoes:
        ev_data = ev.get('data', '')
        ev_dias = dias_atras(ev_data)
        desc_txt = html_to_text(ev.get('descricao', ''))

        if ultima_evolucao_data is None:
            ultima_evolucao_data = ev_data
            ultima_evolucao_dias = ev_dias
            ultimo_proc = desc_txt[:120]

        if ultima_limpeza_data is None and any(k in desc_txt for k in KEYWORDS):
            ultima_limpeza_data = ev_data
            ultima_limpeza_dias = ev_dias

    score = 0
    if info['valor_orcamento'] > 0:               score += 3
    if info['valor_orcamento'] >= 1000:            score += 1
    if info['valor_orcamento'] >= 5000:            score += 1
    if ultima_limpeza_dias and ultima_limpeza_dias > 90:  score += 2
    if ultima_evolucao_dias and ultima_evolucao_dias > 60: score += 1

    prioridade = 'ALTA' if score >= 5 else 'MEDIA' if score >= 2 else 'BAIXA'

    cache[pid] = {
        **info,
        'ultima_limpeza_data': ultima_limpeza_data,
        'ultima_limpeza_dias': ultima_limpeza_dias,
        'ultima_evolucao_data': ultima_evolucao_data,
        'ultima_evolucao_dias': ultima_evolucao_dias,
        'ultimo_proc': ultimo_proc,
        'total_evolucoes': len(evolucoes),
        'score': score,
        'prioridade': prioridade,
    }

    if idx % 50 == 0:
        CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"  [{idx}/{total}] {info['nome'][:40]} — {prioridade}")

    time.sleep(DELAY)

CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding='utf-8')

resultado = sorted(cache.values(), key=lambda x: -x.get('score', 0))
alta  = sum(1 for r in resultado if r.get('prioridade') == 'ALTA')
media = sum(1 for r in resultado if r.get('prioridade') == 'MEDIA')
baixa = sum(1 for r in resultado if r.get('prioridade') == 'BAIXA')

print(f"\n=== Analise completa concluida ===")
print(f"  Total: {len(resultado)} | Alta: {alta} | Media: {media} | Baixa: {baixa} | Erros: {erros}")

out = BASE / "evolucoes_todos_resultado.json"
out.write_text(json.dumps({
    'atualizado': datetime.now().isoformat(),
    'total': len(resultado),
    'alta': alta, 'media': media, 'baixa': baixa,
    'lista': resultado
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"  Resultado salvo em: {out}")
