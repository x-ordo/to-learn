import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { config } from './env';
import { requestId } from './middleware/requestId';
import { errorHandler, ApiError } from './middleware/errorHandler';
import { chatRouter } from './routes/chat';
import { healthRouter } from './routes/health';
import { conversationsRouter } from './routes/conversations';
import { suggestionsRouter } from './routes/suggestions';
import { openApiDocument } from '@fin-one/contracts';

// Express 앱 초기화. Render 등 프록시 환경을 고려하여 trust proxy 설정을 활성화합니다.
const app = express();
app.set('trust proxy', 1);

app.use(requestId);
app.use(helmet());
// CORS 정책 — 허용 리스트 기반. 빈 리스트면 모두 허용(로컬 도구 호출 고려)합니다.
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new ApiError(403, 'CORS_ERROR', '허용되지 않은 출처입니다.'));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));

app.use(
  morgan('combined', {
    skip: (req) => req.path === '/_health'
  })
);

// 간단한 레이트 리미터 — 분당 60 요청
const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false
});
app.use(limiter);

const registerDocsRoutes = (application: express.Express) => {
  application.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  application.get('/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
};

registerDocsRoutes(app);

app.use('/_health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/suggestions', suggestionsRouter);

// 매칭되는 라우트가 없으면 404
app.use(() => {
  throw new ApiError(404, 'NOT_FOUND', '리소스를 찾을 수 없습니다.');
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`to-learn API server listening on port ${config.port}`);
});

if (config.swaggerPort && config.swaggerPort !== config.port) {
  const swaggerApp = express();
  swaggerApp.use(helmet());
  registerDocsRoutes(swaggerApp);
  swaggerApp.listen(config.swaggerPort, () => {
    console.log(`Swagger UI available on port ${config.swaggerPort}`);
  });
}
