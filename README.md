# Controle de Gastos Pessoais

Aplicação desktop-first para registrar receitas e despesas em reais, consultar o extrato e acompanhar limites mensais por categoria. A interface usa HTML5, JavaScript modular, Tailwind CSS e Chart.js.

## Arquitetura

- **MySQL 8.0.16+** guarda contas, categorias, transações e orçamentos. O esquema garante o vínculo dos lançamentos com as categorias do mesmo usuário e tipo.
- **Node.js e Express** servem a API REST e o frontend na mesma origem. A API valida entradas, usa consultas parametrizadas e filtra os dados pelo usuário autenticado. O cadastro grava a conta e as categorias iniciais em uma transação.
- **Frontend** consome a API via `fetch` e guarda o JWT de 12 horas no `localStorage`. As tabelas e os gráficos usam o mês selecionado. O saldo atual é acumulado e o comparativo mostra seis meses até o mês selecionado.

## Como rodar

1. Tenha Node.js 18+, npm e MySQL 8 disponíveis. O servidor MySQL deve estar em execução.
2. A partir da raiz, execute no terminal PowerShell:

   ```powershell
   mysql --default-character-set=utf8mb4 -u root -p --execute="source database/schema.sql"
   cd backend
   npm ci
   Copy-Item .env.example .env
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

   No MySQL Workbench, você também pode abrir e executar `database/schema.sql`. Use uma conta MySQL com permissão para criar o esquema durante a preparação.
3. Preencha `DB_USER`, `DB_PASSWORD` e `JWT_SECRET` em `backend/.env`. Para executar a aplicação, use uma conta com privilégios sobre `finance_db`. Ajuste `DB_HOST` e `DB_PORT` se necessário. Use pelo menos 32 caracteres no segredo JWT.
4. Em `backend`, execute `npm start` e acesse [http://127.0.0.1:3000](http://127.0.0.1:3000). Crie uma conta para começar. O navegador precisa de internet para carregar Tailwind CSS, Chart.js e as fontes via CDN.

Pressione **N** no painel para abrir um novo lançamento. Em **Orçamentos / Metas**, salvar um limite para a mesma categoria e mês atualiza o valor anterior. A barra muda para amarelo em 80% e vermelho a partir de 100%.

## API

Use JSON nas requisições com corpo. Envie `Authorization: Bearer <token>` em todas as rotas, exceto cadastro e login. Envie datas como `AAAA-MM-DD`, meses como `AAAA-MM` e valores positivos com até duas casas decimais. Totais provenientes de colunas DECIMAL podem vir como strings para preservar a precisão.

| Método | Rota | Parâmetros ou corpo |
| --- | --- | --- |
| POST | `/api/auth/register` | `nome, email, senha`. Retorna `usuario` e `token`. |
| POST | `/api/auth/login` | `email, senha`. Retorna `usuario` e `token`. |
| GET | `/api/dashboard/summary` | `mes`. Retorna `saldo_total, receitas_mes, despesas_mes`. |
| GET | `/api/dashboard/chart` | `mes`. Retorna `categorias` e `mensal`. |
| GET | `/api/categorias` | Lista as categorias da conta. |
| POST | `/api/categorias` | `nome, tipo, cor_hex`. |
| GET | `/api/transacoes` | Filtros opcionais `mes, tipo, categoria, busca`. |
| POST | `/api/transacoes` | `categoria_id, descricao, valor, data, tipo`. |
| PUT | `/api/transacoes/:id` | Os mesmos campos da criação. Retorna 204. |
| DELETE | `/api/transacoes/:id` | Remove o lançamento. Retorna 204. |
| GET | `/api/orcamentos` | `mes`. Lista limites e gastos por categoria. |
| POST | `/api/orcamentos` | `categoria_id, limite_mensal, mes_ano`. |

Tipos aceitos: `receita` e `despesa`. Limites mensais se aplicam às categorias de despesa. Em caso de falha, a API retorna um status HTTP e, nas respostas JSON, o campo `erro` explica a falha.

O arquivo `.env` é local e está no `.gitignore`. Versione o `.env.example` para documentar as variáveis.
