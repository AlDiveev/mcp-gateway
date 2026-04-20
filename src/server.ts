import { createApp } from './app';
import config from './config/config';

// TODO: replace stubs with real implementations once Prisma/auth is wired up
const stubAuthService = {
  verifyApiKey: async (_key: string): Promise<string> => {
    throw new Error('Auth not implemented');
  },
};

const stubTunnelService = null as never;

const app = createApp({
  authService: stubAuthService,
  tunnelController: stubTunnelService,
});

app.listen(config.port, () => {
  console.log(`Gateway running on port ${config.port}`);
});
