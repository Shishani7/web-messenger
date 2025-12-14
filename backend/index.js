// подключаем библиотеки
const express = require('express');
const https = require('https');
const fs = require('fs')
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// создаем приложение и задаем порт по умолчанию
const app = express();
const PORT = 3001;

const JWT_SECRET = 'very-very-and-one-more-very-secret'; // потом надо его добавить в .env

// временное хранилище пользователей (потом заменим на БД)
const users = [];

const SALT_ROUNDS = 10;

// проверка токена
const authRequired = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    // если всё ок, пропускает запрос дальше, прикрепив данные к req.user
    req.user = user; 
    next();
  });
};

// включаем поддержку JSON в теле запросов (req.body)
app.use(express.json());

// раздаем статические файлы (минимальный фронтенд)
app.use('/static', express.static(path.join(__dirname, 'public')));

// читаем SSL-сертификаты
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
};

app.get('/', (req, res) => {
    res.send("Hi, server working via HTTPS")
});

app.get('/ui', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/app/ping', (req, res) =>{
    res.json({
        status: 'ok',
        message: 'it\'s work'
    });
});

app.post('/api/echo', (req, res) => {
  const { username, password } = req.body;
  
  res.json({
    received: {
      username,
      password
    }
  })
});

app.post('/api/auth/register', async (req, res) => {
  
  
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ message: 'login and password required' });
  }

  const check = users.find(u => u.login === login);
  if (check) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // хешируем пароль
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  
  const newUser = {
    id: users.length + 1,
    login,
    passwordHash,
  };

  users.push(newUser);

  res.status(201).json({
    id: newUser.id,
    login: newUser.login,
  });
});

app.post('/api/auth/login', async (req, res) => {

  const {login, password} = req.body;

  if(!login || !password){
    return res.status(400).json({message: "login and password required"});
  }

  // ищем пользователя по логину
  const user = users.find(u => u.login === login);
  if(!user){
    return res.status(400).json({ message: 'User not found' });
  }

  // проверяем пароль
  const righthash = await bcrypt.compare(password, user.passwordHash);
  if(!righthash){
    return res.status(400).json({message: 'Wrong in login or password'});
  }

  // генерируем токен
  const token = jwt.sign(
    { id: user.id, login: user.login },
    JWT_SECRET,
    { expiresIn: '1h' } // время жизни токена
  );

  //успешный вход
  res.json({
    id: user.id,
    login: user.login,
    token
  });


});

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json({
    message: 'Authorized access',
    user: req.user // эти данные пришли из токена
  });
});

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`HTTPS server is running, connect to https://localhost:${PORT}`);
});
