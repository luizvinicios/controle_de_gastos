const db = require('../config/db');
const v = require('../validation');

const monthStart = value => v.month(value) + '-01';
const windowSql = 'data >= ? AND data <= LAST_DAY(?)';
const rows = async (sql, args) => (await db.execute(sql, args))[0];

async function category(user, categoryId, type) {
  const [match] = await rows('SELECT id FROM categorias WHERE usuario_id=? AND id=? AND tipo=?', [user, categoryId, type]);
  v.requireValid(match, 'Selecione uma categoria compatível com o tipo.');
}

exports.categories = async (req, res) => res.json(await rows(
  'SELECT id,nome,tipo,cor_hex FROM categorias WHERE usuario_id=? ORDER BY tipo,nome', [req.userId]
));
exports.createCategory = async (req, res) => {
  const { nome, tipo, cor_hex } = req.body;
  v.requireValid(typeof cor_hex === 'string' && /^#[a-f\d]{6}$/i.test(cor_hex), 'Escolha uma cor válida.');
  const result = await rows('INSERT INTO categorias (usuario_id,nome,tipo,cor_hex) VALUES (?,?,?,?)',
    [req.userId, v.field(nome, 80), v.type(tipo), cor_hex]);
  res.status(201).json({ id: result.insertId });
};

exports.transactions = async (req, res) => {
  const { mes, tipo, categoria, busca } = req.query;
  const where = ['t.usuario_id=?'];
  const args = [req.userId];
  if (mes !== undefined) {
    const start = monthStart(mes);
    where.push(windowSql);
    args.push(start, start);
  }
  if (tipo !== undefined) {
    where.push('t.tipo=?');
    args.push(v.type(tipo));
  }
  if (categoria !== undefined) {
    where.push('t.categoria_id=?');
    args.push(v.id(categoria));
  }
  if (busca !== undefined) {
    where.push('LOCATE(?,t.descricao)>0');
    args.push(v.field(busca, 180));
  }
  res.json(await rows(
    'SELECT t.id,t.categoria_id,t.descricao,t.valor,t.data,t.tipo,c.nome AS categoria,c.cor_hex ' +
    'FROM transacoes t JOIN categorias c ON c.id=t.categoria_id WHERE ' +
    where.join(' AND ') + ' ORDER BY t.data DESC,t.id DESC', args
  ));
};

async function transactionFields(req) {
  const { categoria_id, descricao, valor, data, tipo } = req.body;
  const fields = [v.id(categoria_id), v.field(descricao, 180), v.money(valor), v.date(data), v.type(tipo)];
  await category(req.userId, fields[0], fields[4]);
  return fields;
}
exports.createTransaction = async (req, res) => {
  const fields = await transactionFields(req);
  const result = await rows('INSERT INTO transacoes (categoria_id,descricao,valor,data,tipo,usuario_id) VALUES (?,?,?,?,?,?)', [...fields, req.userId]);
  res.status(201).json({ id: result.insertId });
};
exports.updateTransaction = async (req, res) => {
  const id = v.id(req.params.id);
  const fields = await transactionFields(req);
  const result = await rows('UPDATE transacoes SET categoria_id=?,descricao=?,valor=?,data=?,tipo=? WHERE usuario_id=? AND id=?', [...fields, req.userId, id]);
  v.requireValid(result.affectedRows, 'Lançamento não encontrado.', 404);
  res.status(204).end();
};
exports.deleteTransaction = async (req, res) => {
  const result = await rows('DELETE FROM transacoes WHERE usuario_id=? AND id=?', [req.userId, v.id(req.params.id)]);
  v.requireValid(result.affectedRows, 'Lançamento não encontrado.', 404);
  res.status(204).end();
};

exports.summary = async (req, res) => {
  const start = monthStart(req.query.mes);
  const [summary] = await rows(`
    SELECT COALESCE(SUM(IF(tipo='receita',valor,-valor)),0) saldo_total,
      COALESCE(SUM(CASE WHEN tipo='receita' AND ${windowSql} THEN valor END),0) receitas_mes,
      COALESCE(SUM(CASE WHEN tipo='despesa' AND ${windowSql} THEN valor END),0) despesas_mes
    FROM transacoes WHERE usuario_id=?`, [start, start, start, start, req.userId]);
  res.json(summary);
};
exports.chart = async (req, res) => {
  const start = monthStart(req.query.mes);
  const [categorias, mensal] = await Promise.all([
    rows(`SELECT c.nome,c.cor_hex,SUM(t.valor) total FROM transacoes t
      JOIN categorias c ON c.id=t.categoria_id WHERE t.usuario_id=? AND t.tipo='despesa' AND ${windowSql}
      GROUP BY c.id,c.nome,c.cor_hex ORDER BY total DESC`, [req.userId,start,start]),
    rows(`WITH RECURSIVE meses AS (
       SELECT CAST(? AS DATE) inicio, 0 posicao
       UNION ALL SELECT DATE_SUB(inicio,INTERVAL 1 MONTH), posicao+1 FROM meses WHERE posicao<5
     )
     SELECT DATE_FORMAT(m.inicio,'%Y-%m') mes,
       COALESCE(SUM(IF(t.tipo='receita',t.valor,0)),0) receitas,
       COALESCE(SUM(IF(t.tipo='despesa',t.valor,0)),0) despesas
     FROM meses m LEFT JOIN transacoes t ON t.usuario_id=? AND t.data>=m.inicio AND t.data<=LAST_DAY(m.inicio)
     GROUP BY m.inicio ORDER BY m.inicio`, [start,req.userId])
  ]);
  res.json({ categorias, mensal });
};

exports.budgets = async (req, res) => {
  const mes = v.month(req.query.mes);
  res.json(await rows(`
    SELECT o.id,o.categoria_id,o.limite_mensal,o.mes_ano,c.nome,c.cor_hex,
      COALESCE(SUM(t.valor),0) gasto
    FROM orcamentos o JOIN categorias c ON c.id=o.categoria_id
    LEFT JOIN transacoes t ON t.usuario_id=o.usuario_id AND t.categoria_id=o.categoria_id
      AND t.tipo='despesa' AND t.data>=? AND t.data<=LAST_DAY(?)
    WHERE o.usuario_id=? AND o.mes_ano=?
    GROUP BY o.id,o.categoria_id,o.limite_mensal,o.mes_ano,c.nome,c.cor_hex ORDER BY c.nome`,
    [mes+'-01',mes+'-01',req.userId,mes]));
};
exports.saveBudget = async (req, res) => {
  const categoryId = v.id(req.body.categoria_id);
  const month = v.month(req.body.mes_ano);
  const limit = v.money(req.body.limite_mensal);
  await category(req.userId, categoryId, 'despesa');
  await rows(`INSERT INTO orcamentos (usuario_id,categoria_id,limite_mensal,mes_ano)
    VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE limite_mensal=?`, [req.userId,categoryId,limit,month,limit]);
  res.json({ categoria_id: categoryId, mes_ano: month, limite_mensal: limit });
};
