const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const config = await prisma.configuracao.findUnique({ where: { chave: 'token' } });
  const token = config?.valor;
  
  if (!token) {
    console.log("No token in DB");
    return;
  }

  const url = "https://api.simplesdental.com/pacientes?pageSize=10&pageNumber=1";
  console.log("Testing:", url);
  try {
    const res = await fetch(url, {
      headers: {
        "x-auth-token": token,
        "Accept": "application/json"
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Keys:", Object.keys(data));
    console.log("Total Elements:", data.totalElements || 'N/A');
    if (data.content && data.content.length > 0) {
      console.log("Sample Patient:", data.content[0]);
    } else {
      console.log("Data:", data);
    }
  } catch(e) {
    console.log("Error:", e);
  }

  // Testing Orcamentos API
  const url_orc = "https://api.simplesdental.com/orcamentos?pageSize=10&pageNumber=1&status=EM_ABERTO";
  console.log("Testing:", url_orc);
  try {
    const res = await fetch(url_orc, {
      headers: {
        "x-auth-token": token,
        "Accept": "application/json"
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Keys:", Object.keys(data));
    console.log("Total Elements:", data.totalElements || 'N/A');
  } catch(e) {
    console.log("Error:", e);
  }

}
test();
