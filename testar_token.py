"""
Testa os tokens encontrados contra a API do Simples Dental.
"""
import urllib.request
import json

TOKEN_USER   = "QbDYIw4sWwebEvSjFEylCPHbCIDez9rIdxqx24vTt3Kv92VSA6rrDRStW6COH1Y4"
TOKEN_MASTER = "CF3MXdmfzMvcJiTtEHwRnO2hJTRx6zsNoSfwdwxL1ooszCPXWtB9yP8SbLOimGoO"

URL_TEST = "https://api.simplesdental.com/pacientes/37249577/evolucoes?pageSize=2&pageNumber=1&verHtml=true"

def testar(nome, token):
    req = urllib.request.Request(URL_TEST, headers={
        "x-auth-token": token,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://app.simplesdental.com",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
            total = data.get('numberOfElements', '?')
            print(f"  [{nome}] OK - HTTP 200 - {total} evolucoes retornadas")
            return True
    except urllib.error.HTTPError as e:
        print(f"  [{nome}] ERRO HTTP {e.code}: {e.reason}")
        return False
    except Exception as e:
        print(f"  [{nome}] ERRO: {e}")
        return False

print("=== Testando tokens ===")
print()
ok_user   = testar("sd_user_token  ", TOKEN_USER)
ok_master = testar("sd_master_token", TOKEN_MASTER)

print()
if ok_user:
    print("=> Usar TOKEN_USER (x-auth-token)")
elif ok_master:
    print("=> Usar TOKEN_MASTER (x-auth-token)")
else:
    print("=> Nenhum funcionou. Verifique se ainda esta logado no browser.")
