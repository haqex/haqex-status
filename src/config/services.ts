export type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

export interface Service {
  name: string;
  description: string;
  url: string; // URL to ping for health check
  group: string;
}

export interface ServiceWithStatus extends Service {
  status: ServiceStatus;
  responseTime: number | null; // ms
  lastChecked: string;
}

// Add your haqex services here
export const services: Service[] = [
  {
    name: "Haqex Website",
    description: "Main marketing site",
    url: "https://haqex.com",
    group: "Core",
  },
  {
    name: "Haqex API",
    description: "Core API gateway",
    url: "https://api.haqex.com",
    group: "Core",
  },
  {
    name: "Pixora",
    description: "Image processing service",
    url: "https://pixora.haqex.com",
    group: "Apps",
  },
  {
    name: "Apallo",
    description: "Project management platform",
    url: "https://apallo.haqex.com",
    group: "Apps",
  },
];
