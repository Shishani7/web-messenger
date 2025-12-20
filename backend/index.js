require('dotenv').config();

// подключаем библиотеки
const express = require('express');
const https = require('https');
const fs = require('fs')
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

// создаем приложение
const app = express();

// порт и секретный код
const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Создай локально файл .env и напиши туда JWT_SECRET=<рандомный ключ>');
}


// база пользователей и сообщений

const path_to_db = path.join(__dirname, 'data', 'db.json');
// читаем базу данных
async function readDb() {
  const raw = await fs.promises.readFile(path_to_db, 'utf-8');
  return JSON.parse(raw);
}
// записываем в базу
async function writeDb(db) {
  await fs.promises.writeFile(path_to_db, JSON.stringify(db, null, 2), 'utf-8');
}

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
    req.user = { id: user.id, login: user.login }; 
    next();
  });
};

// включаем поддержку JSON в теле запросов (req.body)
app.use(express.json());

// включаем CORS для работы с фронтендом
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://0.0.0.0:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

// раздаем статические файлы
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

app.get('/api/messages', authRequired, async (req, res) => {
  const db = await readDb();
  res.json(db.messages);
});

app.post('/api/messages', authRequired, async (req, res) => {
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'message id empty' });
  }

  const db = await readDb();

  const message = {
    id: db.messages.length + 1,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    user: req.user, // { id, login }
  };

  db.messages.push(message);
  await writeDb(db);

  res.status(201).json(message);
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

  const db = await readDb();
  const users = db.users;

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
  await writeDb(db);
  
  
  // генерим токен
  const token = jwt.sign(
    {id: newUser.id, login: newUser.login},
    JWT_SECRET,
    {expiresIn: '1h'} //время жизни токена
  );

  res.status(201).json({
    id: newUser.id,
    login: newUser.login,
    token
  });
});

app.post('/api/auth/login', async (req, res) => {

  const {login, password} = req.body;

  if(!login || !password){
    return res.status(400).json({message: "login and password required"});
  }

  const db = await readDb();
  const users = db.users;


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
  res.json(req.user);
});

app.get('/api/messages/mine', authRequired, async (req, res) => {
  const db = await readDb();
  const mine = db.messages.filter(m => m.user?.id === req.user.id);
  res.json(mine);
});


https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`HTTPS server is running, connect to https://localhost:${PORT}`);
});
