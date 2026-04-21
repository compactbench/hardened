import axios from "axios";

interface BootstrapConfig {
  data: {
    featureFlags: Record<string, boolean>;
    region: string;
  };
}

export class AppSession {
  private bootstrap: Promise<BootstrapConfig>;
  private startedAt: number;

  constructor(private readonly tenantId: string) {
    this.startedAt = Date.now();
    this.bootstrap = axios.get<BootstrapConfig>(
      `https://api.example.com/v1/tenants/${tenantId}/bootstrap`
    );
  }

  async ready(): Promise<BootstrapConfig> {
    return this.bootstrap;
  }
}
