const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2026';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ ok: false, msg: 'Acesso negado: Token ausente' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    if (verified.organization_id === undefined) {
      return res.status(401).json({ ok: false, msg: 'Token antigo ou inválido. Faça login novamente.' });
    }
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ ok: false, msg: 'Acesso negado: Token inválido' });
  }
}

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ ok: false, msg: 'Acesso negado: Permissão insuficiente' });
    }
    next();
  };
}

module.exports = { authMiddleware, roleMiddleware };
