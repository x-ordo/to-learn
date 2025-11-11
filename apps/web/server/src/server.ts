/**
 * 경량 API 서버 (Next.js edge 프록시 없이 사용 시)
 * ------------------------------------------------
 * 프런트엔드 실험 환경에서 독립적으로 챗봇 엔드포인트를 노출할 수 있도록
 * 최소한의 Express 서버를 제공합니다.
 */
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

// 마지막에 에러 핸들러를 두어 민감한 정보를 노출하지 않도록 합니다.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`ToLearn API running on port ${port}`);
});
