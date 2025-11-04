/*
 * ADOBE CONFIDENTIAL
 * ___________________
 * Copyright 2025 Adobe
 * All Rights Reserved.
 * NOTICE: All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 *  Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */

export interface BitdefenderProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: 'individual' | 'business' | 'enterprise';
  platforms: string[];
  features: string[];
  trialDays: number;
  badge?: string;
}

export const MOCK_PRODUCTS: BitdefenderProduct[] = [
  {
    id: 'premium-security-individual',
    name: 'Bitdefender Premium Security Individual',
    tagline: 'One plan to incorporate multi-awarded device security, password management, unlimited VPN traffic with access to blazing-fast servers & email breach check',
    description: 'Enjoy peace of mind knowing you\'re covered with expert-level protection for your digital life',
    category: 'individual',
    platforms: ['Windows', 'Mac', 'iOS', 'Android'],
    features: [
      'Multi-Awarded Antivirus, Malware & Ransomware Protection',
      'Fully featured password manager to keep your credentials safe',
      'Premium VPN for complete online privacy, UNLIMITED Traffic',
      'Scam Copilot',
      'Cryptomining Protection to prevent the abuse of hackers over your devices',
      'Innovative Email Protection'
    ],
    trialDays: 30,
    badge: 'PREMIUM'
  },
  {
    id: 'total-security-individual',
    name: 'Bitdefender Total Security Individual',
    tagline: 'Complete multi-device protection with award-winning security',
    description: 'Comprehensive security suite with minimal system performance impact, protecting all your devices',
    category: 'individual',
    platforms: ['Windows', 'Mac', 'iOS', 'Android'],
    features: [
      'Multi-awarded antivirus protection',
      'Password manager',
      'Basic VPN (200 MB/day/device)',
      'Scam Prevention',
      'Cryptomining Protection',
      'Multi-device support'
    ],
    trialDays: 30,
    badge: 'POPULAR'
  },
  {
    id: 'antivirus-plus',
    name: 'Bitdefender Antivirus Plus',
    tagline: 'Essential Windows protection with advanced threat defense',
    description: 'Award-winning antivirus protection that keeps your Windows PC safe without slowing it down',
    category: 'individual',
    platforms: ['Windows'],
    features: [
      'Antivirus & malware protection',
      'Scam prevention',
      'Web protection',
      'Ransomware remediation',
      'Anti-tracker',
      'Safe Files'
    ],
    trialDays: 30
  },
  {
    id: 'antivirus-mac',
    name: 'Bitdefender Antivirus for Mac',
    tagline: 'Powerful Mac security with VPN protection',
    description: 'Complete protection for your Mac against malware, adware, and online threats',
    category: 'individual',
    platforms: ['Mac'],
    features: [
      'Real-time virus protection',
      'Adware blocking',
      'VPN included',
      'Time Machine Protection',
      'Cross-platform malware detection',
      'Safe browsing'
    ],
    trialDays: 30
  }
];

export function getProductById(id: string): BitdefenderProduct | undefined {
  return MOCK_PRODUCTS.find(product => product.id === id);
}
