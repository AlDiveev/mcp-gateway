export type TunnelStatus = 'active' | 'inactive';

export interface Tunnel {
  id: string;
  userId: number;
  authToken: string;
  status: TunnelStatus;
  createdAt: Date;
  lastConnectedAt: Date | null;
}

export interface CreateTunnelDto {}

export interface TunnelResponse {
  id: string;
  publicUrl: string;
  status: TunnelStatus;
  createdAt: string;
  lastConnectedAt: string | null;
}

export interface CreateTunnelResponse extends TunnelResponse {
  authToken: string;
  wsUrl: string;
}
