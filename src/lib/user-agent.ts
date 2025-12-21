export interface ParsedUserAgent {
  browser?: string;
  os?: string;
  device?: string;
}

export function parseUserAgent(userAgent?: string | null): ParsedUserAgent {
  if (!userAgent) {
    return {};
  }

  const result: ParsedUserAgent = {};

  // Parse browser
  const browserRegex = [
    { name: 'Chrome', regex: /Chrome\/[\d.]+/ },
    { name: 'Firefox', regex: /Firefox\/[\d.]+/ },
    { name: 'Safari', regex: /Safari\/[\d.]+/ },
    { name: 'Edge', regex: /Edg\/[\d.]+/ },
    { name: 'Opera', regex: /Opera\/[\d.]+/ },
    { name: 'IE', regex: /MSIE [\d.]+/ },
  ];

  for (const { name, regex } of browserRegex) {
    const match = userAgent.match(regex);
    if (match) {
      result.browser = name;
      break;
    }
  }

  // Parse OS
  const osRegex = [
    { name: 'Windows', regex: /Windows NT [\d.]+/ },
    { name: 'macOS', regex: /Mac OS X [\d._]+/ },
    { name: 'Linux', regex: /Linux/ },
    { name: 'Android', regex: /Android [\d.]+/ },
    { name: 'iOS', regex: /iPhone OS [\d._]+/ },
    { name: 'iPadOS', regex: /iPad OS [\d._]+/ },
  ];

  for (const { name, regex } of osRegex) {
    const match = userAgent.match(regex);
    if (match) {
      result.os = name;
      break;
    }
  }

  // Parse device
  const deviceRegex = [
    { name: 'Mobile', regex: /Mobile|iPhone|Android/ },
    { name: 'Tablet', regex: /iPad|Tablet/ },
    { name: 'Desktop', regex: /Windows NT|Mac OS X|Linux/ },
  ];

  for (const { name, regex } of deviceRegex) {
    const match = userAgent.match(regex);
    if (match) {
      result.device = name;
      break;
    }
  }

  return result;
}