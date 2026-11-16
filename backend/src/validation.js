function requireValid(condition, message, status = 400) {
  if (!condition) throw Object.assign(new Error(message), { status });
}
function field(value, max) {
  const clean = typeof value === 'string' ? value.trim() : '';
  requireValid(clean && clean.length <= max, 'Confira os campos preenchidos.');
  return clean;
}
function type(value) {
  requireValid(['receita', 'despesa'].includes(value), 'Tipo inválido.');
  return value;
}
function id(value) {
  requireValid(/^\d+$/.test(String(value)) && Number(value) > 0 && Number(value) <= 4294967295, 'Identificador inválido.');
  return Number(value);
}
function money(value) {
  requireValid(/^\d{1,8}(\.\d{1,2})?$/.test(String(value)) && Number(value) > 0, 'Informe um valor positivo com até duas casas decimais.');
  return String(value);
}
function month(value) {
  requireValid(typeof value === 'string' && /^(?:[1-8]\d{3}|9\d{3})-(0[1-9]|1[0-2])$/.test(value), 'Use um mês no formato AAAA-MM.');
  return value;
}
function date(value) {
  requireValid(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Data inválida.');
  month(value.slice(0, 7));
  const parsed = new Date(value + 'T00:00:00Z');
  requireValid(!Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === value, 'Data inválida.');
  return value;
}
module.exports = { requireValid, field, type, id, money, month, date };
