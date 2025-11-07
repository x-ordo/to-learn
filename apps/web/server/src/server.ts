import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors, { CorsOptions } from 'cors';
import { chatRouter } from './routes/chat';
import { healthRouter } from './routes/health';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!allowedOrigins || allowedOrigins.length === 0) {
      return callback(null, true);
    }
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS policy'));
  }
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

app.use('/api', chatRouter);
app.use(healthRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`ToLearn API running on port ${port}`);
});

