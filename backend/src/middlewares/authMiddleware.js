const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = /^Bearer (\S+)$/i.exec(req.get('authorization') || '')?.[1];
  try {
    const { sub } = jwt.verify(token || '', process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = Number(sub);
  } catch {
    return res.status(401).json({ erro: 'Entre novamente para continuar.' });
  }
  next();
};
