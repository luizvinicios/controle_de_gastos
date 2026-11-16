require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres.');
}
const app = require('./src/app');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3000);
app.listen(port, host, () => console.log('Controle de Gastos em http://' + host + ':' + port));
