import os from 'node:os';

export interface NetworkAddressInfo {
  name: string;
  ip: string;
  isWifiOrEthernet: boolean;
  score?: number;
}

function isVirtualInterface(name: string): boolean {
  return /^(docker|br-|veth|tailscale|tun|tap|virbr|vmnet|vboxnet|vEthernet)/i.test(name);
}

function isPhysicalLanInterface(name: string): boolean {
  return /^(wl|en|eth|wi-fi|ethernet)/i.test(name) && !isVirtualInterface(name);
}

function calculateInterfaceScore(name: string, ip: string): number {
  let score = 0;
  if (isPhysicalLanInterface(name)) score += 50;
  if (!isVirtualInterface(name)) score += 20;

  if (/^192\.168\./.test(ip)) {
    score += 30;
  } else if (/^10\./.test(ip)) {
    score += 25;
  } else if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) {
    score += 20;
  }

  return score;
}

/**
 * Retorna todos os endereços IPv4 locais disponíveis para escuta na rede, ordenados pelos mais adequados
 */
export function getLocalIpAddresses(): NetworkAddressInfo[] {
  const ifaces = os.networkInterfaces();
  const addresses: NetworkAddressInfo[] = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4') {
        const isInternal = addr.internal;
        const isVirtual = isVirtualInterface(name);
        const isWifiOrEth = (isPhysicalLanInterface(name) || !isInternal) && !isVirtual;
        
        if (!isInternal) {
          addresses.push({
            name,
            ip: addr.address,
            isWifiOrEthernet: isWifiOrEth,
            score: calculateInterfaceScore(name, addr.address),
          });
        }
      }
    }
  }

  // Ordenar pelos melhores endereços de rede local (Wi-Fi/Ethernet LAN)
  addresses.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Se estiver em ambiente sem interface externa detectada (ou loopback), inclui localhost
  if (addresses.length === 0) {
    addresses.push({
      name: 'lo (Localhost)',
      ip: '127.0.0.1',
      isWifiOrEthernet: false,
      score: 0,
    });
  }

  return addresses;
}

/**
 * Retorna o melhor IP padrão para exibição (priorizando Wi-Fi ou Ethernet)
 */
export function getPrimaryLocalIp(): string {
  const addrs = getLocalIpAddresses();
  const primary = addrs.find((a) => a.isWifiOrEthernet && (a.score || 0) >= 50) || addrs[0];
  return primary ? primary.ip : '127.0.0.1';
}


