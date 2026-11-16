const router = require('express').Router();
const auth = require('../controllers/auth');
const finance = require('../controllers/finance');

router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.use(require('../middlewares/authMiddleware'));
router.get('/dashboard/summary', finance.summary);
router.get('/dashboard/chart', finance.chart);
router.get('/categorias', finance.categories);
router.post('/categorias', finance.createCategory);
router.get('/transacoes', finance.transactions);
router.post('/transacoes', finance.createTransaction);
router.put('/transacoes/:id', finance.updateTransaction);
router.delete('/transacoes/:id', finance.deleteTransaction);
router.get('/orcamentos', finance.budgets);
router.post('/orcamentos', finance.saveBudget);
module.exports = router;
