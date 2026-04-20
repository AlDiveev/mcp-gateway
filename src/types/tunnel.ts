export type TunnelStatus = 'active' | 'inactive';

export interface Tunnel {
  id: string;
  subdomain: string;
  userId: string;
  authToken: string;
  status: TunnelStatus;
  createdAt: Date;
  lastConnectedAt: Date | null;
}

export interface CreateTunnelDto {
  subdomain?: string;
}

export interface TunnelResponse {
  id: string;
  subdomain: string;
  publicUrl: string;
  status: TunnelStatus;
  createdAt: string;
  lastConnectedAt: string | null;
}

export interface CreateTunnelResponse extends TunnelResponse {
  authToken: string;
}
