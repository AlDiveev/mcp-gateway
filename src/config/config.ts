import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    wsPort: number;
    nodeEnv: string;
    publicUrl: string;
    wsPublicUrl: string;
    tlsKeyPath?: string;
    tlsCertPath?: string;
}

const port = Number(process.env.PORT) || 3000;
const wsPort = Number(process.env.WS_PORT) || 3001;
const tlsKeyPath = process.env.TLS_KEY_PATH;
const tlsCertPath = process.env.TLS_CERT_PATH;
const tlsEnabled = Boolean(tlsKeyPath && tlsCertPath);
const scheme = tlsEnabled ? 'https' : 'http';
const wsScheme = tlsEnabled ? 'wss' : 'ws';

const config: Config = {
    port,
    wsPort,
    nodeEnv: process.env.NODE_ENV || 'development',
    publicUrl: process.env.PUBLIC_URL || `${scheme}://localhost:${port}`,
    wsPublicUrl: process.env.WS_PUBLIC_URL || `${wsScheme}://localhost:${wsPort}`,
    tlsKeyPath,
    tlsCertPath,
};

export default config;
