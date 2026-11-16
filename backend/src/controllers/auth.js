const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { field, requireValid } = require('../validation');

const defaults = [
  ['Salário', 'receita', '#009F75'], ['Freelance', 'receita', '#2F77DD'],
  ['Alimentação', 'despesa', '#EE876C'], ['Moradia', 'despesa', '#7263D9'],
  ['Transporte', 'despesa', '#479BE4'], ['Lazer', 'despesa', '#DB6BA7'],
  ['Saúde', 'despesa', '#249B87']
];

function session(user) {
  const { id, nome, email } = user;
  return {
    usuario: { id, nome, email },
    token: jwt.sign({}, process.env.JWT_SECRET, { subject: String(id), expiresIn: '12h', algorithm: 'HS256' })
  };
}

exports.register = async (req, res) => {
  const nome = field(req.body.nome, 100);
  const email = field(req.body.email, 254).toLowerCase();
  const { senha } = req.body;
  requireValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'E-mail inválido.');
  requireValid(typeof senha === 'string' && senha.length >= 8 && Buffer.byteLength(senha) <= 72, 'Use uma senha com pelo menos 8 caracteres e até 72 bytes.');
  const hash = await bcrypt.hash(senha, 12);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [{ insertId }] = await conn.execute('INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)', [nome,email,hash]);
    await conn.query('INSERT INTO categorias (usuario_id,nome,tipo,cor_hex) VALUES ?', [defaults.map(row => [insertId, ...row])]);
    await conn.commit();
    res.status(201).json(session({ id: insertId, nome, email }));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

exports.login = async (req, res) => {
  const email = field(req.body.email, 254).toLowerCase();
  const { senha } = req.body;
  requireValid(typeof senha === 'string' && Buffer.byteLength(senha) <= 72, 'E-mail ou senha inválidos.', 401);
  const [[user]] = await db.execute('SELECT id,nome,email,senha_hash FROM usuarios WHERE email=?', [email]);
  requireValid(user && await bcrypt.compare(senha, user.senha_hash), 'E-mail ou senha inválidos.', 401);
  res.json(session(user));
};
