// подключаем библиотеки
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';


// создаём приложение Express
const app = express();
// порт из PORT или 3000 по умолчанию
const PORT = process.env.PORT || 3000;
//подлючаем функции 
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
// на корневой путь возвращаем JSON с сообщением ok
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});
// слушаем порт
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
