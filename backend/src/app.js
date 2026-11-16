const express = require('express');
const path = require('node:path');
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', require('./routes'));
app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use(express.static(path.resolve(__dirname, '../../frontend')));
app.use((err, _req, res, _next) => {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Já existe um registro com esses dados.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ erro: 'Dados acima do tamanho permitido.' });
  if (err.status) return res.status(err.status).json({ erro: err.message });
  const dbUnavailable = ['ECONNREFUSED','ENOTFOUND','ETIMEDOUT','ER_ACCESS_DENIED_ERROR','ER_BAD_DB_ERROR','ER_NO_SUCH_TABLE'].includes(err.code);
  console.error(err.code || err.name);
  res.status(dbUnavailable ? 503 : 500).json({ erro: dbUnavailable ? 'MySQL indisponível. Confira a conexão e a configuração do banco.' : 'Erro interno.' });
});
module.exports = app;
