# ACA Dental Web

Plataforma Web (React + Node.js + PostgreSQL) focada em gestão de pacientes e disparo automatizado de mensagens de WhatsApp para clínicas odontológicas, integrada ao **Simples Dental** e **Evolution API**.

O sistema foi estruturado em um formato **Multi-Tenant (SaaS)**, permitindo que várias clínicas operem na mesma base de dados de forma completamente isolada.

---

## 🌟 Funcionalidades Básicas

- **Multi-Clínicas (SaaS):** Gestão de múltiplas filiais ou clínicas isoladas (cada clínica possui seu próprio banco de contatos e configurações).
- **Integração Simples Dental:** Sincroniza periodicamente pacientes, orçamentos, evoluções e alertas de aniversário diretamente da plataforma Simples Dental.
- **Radar de Limpezas (Recall):** Calcula a última vez que o paciente fez limpeza/profilaxia e cria campanhas automáticas para chamá-los de volta após o prazo ideal (ex: 6 meses).
- **Gestão de Campanhas em Lote:** Disparo inteligente em massa usando a Evolution API, com controle de intervalo, status e tentativas de reenvio.
- **Autenticação Segura:** Controle de permissões (Administradores da Clínica e Master global).

---

## 🛠️ Requisitos Mínimos

Para rodar o projeto localmente ou em servidor (como Dokploy/VPS), você precisará de:

- **Node.js** v18+ 
- **PostgreSQL** v14+ (Banco de Dados relacional para as entidades Prisma).
- **Redis** v6+ (Recomendado para fila/cache da Evolution API).
- **Evolution API** v2.1+ (Servidor de WhatsApp que será responsável por enviar as mensagens e gerar o QR Code).

---

## 🚀 Como Subir o Projeto (Local)

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/Davisvasconcellos/aca-dental-web.git
   cd aca-dental-web
   ```

2. **Backend (API + Banco de Dados)**
   - Acesse a pasta `/BACKEND`: `cd BACKEND`
   - Instale as dependências: `npm install`
   - Crie um arquivo `.env` na pasta BACKEND e preencha a string do Postgres (exemplo: `DATABASE_URL="postgresql://user:pass@localhost:5432/db"`).
   - Gere o cliente Prisma e rode as migrations: `npx prisma generate` e `npx prisma db push`.
   - Inicie o servidor: `npm run dev` (rodará na porta 3000).

3. **Frontend (Interface Web)**
   - Acesse a pasta `/FRONTEND`: `cd ../FRONTEND`
   - Instale as dependências: `npm install`
   - Inicie o App: `npm run dev` (rodará na porta 5173).

> **Acesso Inicial:** O sistema usa um painel "Master" (`davisvasconcellos@gmail.com` / `senha123`) para criar as clínicas e administradores de clínica.

---

## 🔑 Como Buscar o Token do Simples Dental

O sistema ACA Dental extrai os relatórios puxando os dados da API não oficial do Simples Dental. Para isso, você precisa capturar o token de sessão da recepcionista:

1. Acesse o [Simples Dental](https://app.simplesdental.com) pelo Google Chrome e faça o login normal na sua clínica.
2. Pressione a tecla **F12** no teclado para abrir as Ferramentas de Desenvolvedor.
3. Clique na aba **Network** (Rede). Se a aba estiver vazia, aperte `F5` na página do Simples Dental.
4. No campo de busca (Filter), digite `api.simplesdental`.
5. Clique em qualquer resultado que aparecer na lista abaixo.
6. Na janela à direita, role até a seção **Request Headers** e procure pelo campo chamado `x-auth-token`.
7. Copie aquele longo código (esse é o seu Token).
8. No painel **ACA Dental**, vá em **Configurações > Configurações de API**, cole esse código e salve!

---

## 📱 Como Conectar ao WhatsApp (Evolution API)

Para que o ACA Dental dispare mensagens automaticamente, você precisa parear o WhatsApp de atendimento da clínica:

1. Faça o Login no ACA Dental como Administrador da Clínica.
2. No menu lateral, clique em **Configurações**.
3. Na aba **Automação WA**, localize o bloco "API WhatsApp".
4. Clique no botão azul **📱 Parear WhatsApp (QR)**.
5. Um modal se abrirá carregando o QR Code diretamente do seu servidor da Evolution API.
6. Abra o WhatsApp no celular da clínica > Configurações > **Aparelhos Conectados** > Conectar um aparelho.
7. Aponte a câmera para a tela do computador.
8. Assim que vibrar no celular, feche o modal. O status do painel mudará sozinho para **Conectada (Ativa)**!

> **Nota para o Master:** A URL da Evolution e o token da Evolution devem ser pré-cadastrados internamente para a clínica antes de o botão do QR code funcionar.
