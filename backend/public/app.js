function setOutput(data) {
  const pre = document.getElementById('output');
  pre.textContent =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

async function request(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}

function getForm() {
  const login = document.getElementById('login').value.trim();
  const password = document.getElementById('password').value;
  return { login, password };
}

document.getElementById('btnRegister').addEventListener('click', async () => {
  try {
    setOutput('Отправляю запрос регистрации...');
    const { login, password } = getForm();
    const data = await request('/api/auth/register', 'POST', { login, password });
    setOutput({ ok: true, action: 'register', data });
  } catch (err) {
    setOutput({ ok: false, action: 'register', error: err.message });
  }
});

document.getElementById('btnLogin').addEventListener('click', async () => {
  try {
    setOutput('Отправляю запрос логина...');
    const { login, password } = getForm();
    const data = await request('/api/auth/login', 'POST', { login, password });
    setOutput({ ok: true, action: 'login', data });
  } catch (err) {
    setOutput({ ok: false, action: 'login', error: err.message });
  }
});

document.getElementById('btnPing').addEventListener('click', async () => {
  try {
    setOutput('Пингуем сервер...');
    const data = await request('/app/ping', 'GET');
    setOutput({ ok: true, action: 'ping', data });
  } catch (err) {
    setOutput({ ok: false, action: 'ping', error: err.message });
  }
});

