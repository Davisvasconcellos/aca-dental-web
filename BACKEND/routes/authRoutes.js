const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-2026';

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  
  try {
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ ok: false, msg: 'Usuário ou senha inválidos' });
    }

    const validPass = await bcrypt.compare(senha, user.senha);
    if (!validPass) {
      return res.status(401).json({ ok: false, msg: 'Usuário ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, organization_id: user.organization_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, msg: 'Erro interno' });
  }
});

module.exports = router;
