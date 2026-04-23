import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    wsPort: number;
    nodeEnv: string;
    publicUrl: string;
    wsPublicUrl: string;
}

const port = Number(process.env.PORT) || 3000;
const wsPort = Number(process.env.WS_PORT) || 3001;

const config: Config = {
    port,
    wsPort,
    nodeEnv: process.env.NODE_ENV || 'development',
    publicUrl: process.env.PUBLIC_URL || `http://localhost:${port}`,
    wsPublicUrl: process.env.WS_PUBLIC_URL || `ws://localhost:${wsPort}`,
};

export default config;
