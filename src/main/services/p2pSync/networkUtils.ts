import os from 'node:os';

export interface NetworkAddressInfo {
  name: string;
  ip: string;
  isWifiOrEthernet: boolean;
}

/**
 * Retorna todos os endereços IPv4 locais disponíveis para escuta na rede
 */
export function getLocalIpAddresses(): NetworkAddressInfo[] {
  const ifaces = os.networkInterfaces();
  const addresses: NetworkAddressInfo[] = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4') {
        const isInternal = addr.internal;
        const isWifiOrEth = /wlan|eth|en|wi-fi|ethernet/i.test(name) || !isInternal;
        
        if (!isInternal) {
          addresses.push({
            name,
            ip: addr.address,
            isWifiOrEthernet: isWifiOrEth,
          });
        }
      }
    }
  }

  // Se estiver em ambiente sem interface externa detectada (ou loopback), inclui localhost
  if (addresses.length === 0) {
    addresses.push({
      name: 'lo (Localhost)',
      ip: '127.0.0.1',
      isWifiOrEthernet: false,
    });
  }

  return addresses;
}

/**
 * Retorna o melhor IP padrão para exibição (priorizando Wi-Fi ou Ethernet)
 */
export function getPrimaryLocalIp(): string {
  const addrs = getLocalIpAddresses();
  const primary = addrs.find((a) => a.isWifiOrEthernet) || addrs[0];
  return primary ? primary.ip : '127.0.0.1';
}

