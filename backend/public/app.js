function setOutput(data) {
  const pre = document.getElementById('output');
  pre.textContent =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

async function request(path, method, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';

  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
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
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
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
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
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

document.getElementById('btnMe')?.addEventListener('click', async () => {
  try {
    setOutput('Запрашиваю профиль...');
    const data = await request('/api/auth/me', 'GET');
    setOutput({ ok: true, action: 'me', data });
  } catch (err) {
    setOutput({ ok: false, action: 'me', error: err.message });
  }
});

function setMessagesOutput(data) {
  const pre = document.getElementById('messagesOutput');
  pre.textContent =
    typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

document.getElementById('btnLoad')?.addEventListener('click', async () => {
  try {
    setMessagesOutput('Загружаю сообщения...');
    const data = await request('/api/messages', 'GET');
    setMessagesOutput(data.length ? data : 'Пока сообщений нет.');
  } catch (err) {
    setMessagesOutput({ ok: false, action: 'load', error: err.message });
  }
});

document.getElementById('btnLoadMine')?.addEventListener('click', async () => {
  try {
    setMessagesOutput('Загружаю только мои сообщения...');
    const data = await request('/api/messages/mine', 'GET');
    setMessagesOutput(data.length ? data : 'Моих сообщений пока нет.');
  } catch (err) {
    setMessagesOutput({ ok: false, action: 'load-mine', error: err.message });
  }
});


document.getElementById('btnSend')?.addEventListener('click', async () => {
  try {
    const input = document.getElementById('msg');
    const content = input.value;

    setMessagesOutput('Отправляю сообщение...');
    const data = await request('/api/messages', 'POST', { content });

    input.value = '';
    setMessagesOutput({ ok: true, action: 'send', data });
  } catch (err) {
    setMessagesOutput({ ok: false, action: 'send', error: err.message });
  }
});
