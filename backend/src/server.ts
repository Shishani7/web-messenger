//  import neccessary libraries
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { NextFunction } from 'express';


dotenv.config();



// create express app
const app = express();
// port from env or default 3000
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'our-personal-secret-tsss';


// path to the data file
const DATA_FILE = path.resolve(__dirname, '../data/db.json');

// use middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// on the root path return JSON with message ok
app.get('/api/messages', authRequired, async (_req: Request, res: Response) => {
  const db = await readDb();
  return res.json(db.messages.slice(-100));
});

app.post('/api/messages', authRequired, async (req: Request, res: Response) => {
  const { text } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }

  const clean = text.trim().slice(0, 640);
  const payload = (req as any).user as { sub: string; username: string };
  const message = {
    id: crypto.randomUUID(),
    userId: payload.sub,
    username: payload.username,
    text: clean,
    createdAt: new Date().toISOString(),
  };

  const db = await readDb();
  db.messages.push(message);
  await writeDb(db);

  return res.status(201).json(message);
});

// --- start ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const normalized = sanitizeUsername(username);
  if (!normalized || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Введите логин и пароль (>=6 символов)' });
  }

  const db = await readDb();
  if (db.users.find((u) => u.username === normalized)) {
    return res.status(409).json({ error: 'Пользователь уже существует' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    username: normalized,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeDb(db);

  const token = signToken(user);
  return res.status(201).json({ token, user: { id: user.id, username: user.username } });
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const normalized = sanitizeUsername(username);
  if (!normalized || typeof password !== 'string') {
    return res.status(400).json({ error: 'Неверный логин или пароль' });
  }

  const db = await readDb();
  const user = db.users.find((u) => u.username === normalized);
  if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const token = signToken(user);
  return res.json({ token, user: { id: user.id, username: user.username } });
});


function sanitizeUsername(username: string): string {
  return typeof username === 'string' ? username.trim().toLowerCase() : '';
}

function signToken(user: { id: string; username: string }) {
  return jwt.sign({ sub: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
}


// middleware to check for authentication
function authRequired(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authorization required' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; username: string };
    (req as any).user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'PROBLEM WITH TOKEN' });
  }
}


// functions for working with the data file

// function to ensure that the data file exists
async function ensureDataFile(){
  
  // create directory data, if it doesn't exist
  await fsPromises.mkdir(path.dirname(DATA_FILE), { recursive: true});
  
  // create the db.json file with initial data if it doesn't exist
  try {
  await fsPromises.access(DATA_FILE);
  }
  catch {
    const seed = {users: [] , messages: []};
    await fsPromises.writeFile(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

// functiom for reading data from the file
async function readDb(): Promise<{ users: any[]; messages: any[] }> {
  await ensureDataFile();
  const raw = await fsPromises.readFile(DATA_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return { users: [], messages: [] };
  }
}

// function for writing data to the file
async function writeDb(data: { users: any[]; messages: any[] }) {
  await fsPromises.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

