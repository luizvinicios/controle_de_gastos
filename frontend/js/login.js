import { api, saveSession, token } from './api.js';
if (token()) location.replace('/');
const form = document.querySelector('#auth-form');
const error = document.querySelector('#auth-error');
const toggle = document.querySelector('#switch-mode');
const submit = form.querySelector('button');
let register = false;
toggle.addEventListener('click', () => {
  register = !register;
  document.querySelector('#auth-title').textContent = register ? 'Crie sua conta' : 'Entre na sua conta';
  document.querySelector('#name-field').hidden = !register;
  form.elements.nome.required = register;
  form.elements.senha.minLength = register ? 8 : 0;
  form.elements.senha.autocomplete = register ? 'new-password' : 'current-password';
  submit.textContent = register ? 'Criar conta' : 'Entrar';
  toggle.textContent = register ? 'Já tenho uma conta' : 'Criar uma conta';
  error.textContent = '';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = toggle.disabled = true;
  error.textContent = '';
  try {
    const body = Object.fromEntries(new FormData(form));
    saveSession(await api('/auth/' + (register ? 'register' : 'login'), { method: 'POST', body }));
    location.replace('/');
  } catch (err) {
    error.textContent = err.message;
  } finally {
    submit.disabled = toggle.disabled = false;
  }
});
