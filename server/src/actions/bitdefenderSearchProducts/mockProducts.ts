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
  trialUrl: string;
  badge?: string;
  basePrice: number;
  price: {
    amount: number;
    currency: string;
    period: 'year' | 'month';
  };
}

export const MOCK_PRODUCTS: BitdefenderProduct[] = [
  {
    id: 'ultimate-security-individual',
    name: 'Bitdefender Ultimate Security Individual',
    tagline: 'Complete device, data, and identity protection',
    description: 'Protect your devices, personal data, and online identity with Dark Web monitoring, digital footprint scanning, and real-time breach notifications for up to 5 devices',
    category: 'individual',
    platforms: ['Windows', 'macOS', 'iOS', 'Android'],
    trialUrl: 'https://login.bitdefender.com/central/signup.html?adobe_mc_ref=&icid=button%257Cc%257Cps_i%257Ctrial_link_dw&redirect_url=https:%2F%2Fcentral.bitdefender.com%2Fdashboard%3Fservice%3Dadd_trial%26code%3D9f6b56dc-05a5-405b-b58a-6c3afb5cae31%26login_type%3Dcreate_account%26final_url%3D%2Fdevices&lang=en_US&adobe_mc=MCMID%3D19544693930179770020939471696493833059%7CMCORGID%3D0E920C0F53DA9E9B0A490D45%2540AdobeOrg%7CTS%3D1744281434&_gl=1*12j0pus*_ga*NDkzNTU4MzIyLjE3NjIzMjg4Njg.*_ga_6M0GWNLLWF*czE3NjIzNTM3MjMkbzQkZzEkdDE3NjIzNTM4MDkkajUyJGwwJGgxNjEwNDgxMDc2',
    features: [
      'All features from Premium Security Individual',
      'Identity protection and monitoring',
      'Dark Web monitoring',
      'Real-time breach notifications',
      'Digital footprint scanning',
      'Security recommendations from Bitdefender experts',
      'Protection for up to 5 devices',
    ],
    trialDays: 30,
    badge: 'ULTIMATE',
    basePrice: 179.99,
    price: {
      amount: 129.99,
      currency: 'USD',
      period: 'year',
    },
  },
  {
    id: 'premium-security-individual',
    name: 'Bitdefender Premium Security Individual',
    tagline: 'Advanced protection with unlimited VPN and privacy features',
    description: 'Complete security for up to 5 devices with unlimited Premium VPN, ad blocking, anti-tracker, and webcam protection for maximum online privacy',
    category: 'individual',
    platforms: ['Windows', 'macOS', 'iOS', 'Android'],
    trialUrl: 'https://login.bitdefender.com/central/signup.html?adobe_mc_ref=&icid=button%257Cc%257Cts_i%257Ctrial_link_dw&redirect_url=https:%2F%2Fcentral.bitdefender.com%2Fdashboard%3Fservice%3Dadd_trial%26code%3Dd8bbe4b5-08d0-4c9b-8cf0-c043f63b98da%26login_type%3Dcreate_account%26final_url%3D%2Fdevices&lang=en_US&_gl=1*2z7dvb*_ga*NDkzNTU4MzIyLjE3NjIzMjg4Njg.*_ga_6M0GWNLLWF*czE3NjIzNTM3MjMkbzQkZzEkdDE3NjIzNTM4MzQkajI3JGwwJGgxNjEwNDgxMDc2',
    features: [
      'All features from Total Security Individual',
      'Premium VPN with unlimited traffic',
      'Access to 4000+ VPN servers in 50+ countries',
      'Ad-Blocker and Anti-Tracker',
      'Webcam and microphone protection',
      'Protection for up to 5 devices',
      'OneClick Optimizer',
    ],
    trialDays: 30,
    badge: 'POPULAR',
    basePrice: 119.99,
    price: {
      amount: 89.99,
      currency: 'USD',
      period: 'year',
    },
  },
  {
    id: 'total-security-individual',
    name: 'Bitdefender Total Security Individual',
    tagline: 'Essential protection for all your devices',
    description: '24/7 AI-based real-time protection for up to 5 devices with password management and comprehensive security features',
    category: 'individual',
    platforms: ['Windows', 'macOS', 'iOS', 'Android'],
    trialUrl: 'https://login.bitdefender.com/central/signup.html?adobe_mc_ref=&icid=button%257Cc%257Cts_i%257Ctrial_link_dw&redirect_url=https:%2F%2Fcentral.bitdefender.com%2Fdashboard%3Fservice%3Dadd_trial%26code%3Dd8bbe4b5-08d0-4c9b-8cf0-c043f63b98da%26login_type%3Dcreate_account%26final_url%3D%2Fdevices&lang=en_US&_gl=1*1fwyjo0*_ga*NDkzNTU4MzIyLjE3NjIzMjg4Njg.*_ga_6M0GWNLLWF*czE3NjIzNTM3MjMkbzQkZzEkdDE3NjIzNTM5NTEkajUkbDAkaDE2MTA0ODEwNzY.',
    features: [
      '24/7 real-time protection based on AI',
      'Protection against phishing and online scams',
      'Password Manager',
      'Protection for up to 5 devices',
      'Low performance impact',
      'Safe browsing protection',
    ],
    trialDays: 30,
    basePrice: 89.99,
    price: {
      amount: 59.99,
      currency: 'USD',
      period: 'year',
    },
  },
  {
    id: 'gravityzone-business-security-premium',
    name: 'GravityZone Business Security Premium',
    tagline: 'Aggressive protection against sophisticated threats',
    description: 'Ideal for companies seeking aggressive protection against sophisticated threats with advanced machine learning, sandbox analysis, and comprehensive email security',
    category: 'business',
    platforms: ['Windows', 'macOS', 'iOS', 'Linux'],
    trialUrl: 'https://www.bitdefender.com/en-us/business/products/free-trials/business-security-premium-free-trial',
    features: [
      'All features from Business Security',
      'Customizable machine learning (HyperDetect) to automatically combat targeted and advanced attacks',
      'Sandbox Analyzer for safe threat analysis in cloud-hosted sandbox',
      'Microsoft Exchange coverage',
      'Top-tier antispam and antimalware programs for email servers',
      'Enterprise-level security overview across all protected endpoints',
    ],
    trialDays: 30,
    badge: 'PREMIUM',
    basePrice: 699.99,
    price: {
      amount: 549.99,
      currency: 'USD',
      period: 'year',
    },
  },
  {
    id: 'gravityzone-business-security',
    name: 'GravityZone Business Security',
    tagline: 'Comprehensive security that proactively reduces risks',
    description: 'Ideal for small companies wanting comprehensive security that combats threats and proactively reduces risks with network attack defense and device control',
    category: 'business',
    platforms: ['Windows', 'macOS', 'iOS', 'Linux'],
    trialUrl: 'https://www.bitdefender.com/en-us/business/products/free-trials/business-security-free-trial',
    features: [
      'All features from Small Business Security',
      'Network Attack Defense to protect against network attacks',
      'Web access control to allow or block user or application web access',
      'Device control to prevent data leakage and malware infections from external devices',
      'Endpoint risk analysis to identify, assess, and remediate endpoint vulnerabilities',
      'Centralized security management console',
    ],
    trialDays: 30,
    badge: 'POPULAR',
    basePrice: 499.99,
    price: {
      amount: 399.99,
      currency: 'USD',
      period: 'year',
    },
  },
  {
    id: 'gravityzone-small-business-security',
    name: 'GravityZone Small Business Security',
    tagline: 'Enterprise-level security at an affordable price',
    description: 'Ideal for small companies wanting an affordable enterprise-level security solution with set-and-forget protection against phishing, ransomware, and web-based attacks',
    category: 'business',
    trialUrl: 'https://www.bitdefender.com/en-us/business/products/free-trials/gravityzone-small-business-security-free-trial',
    platforms: ['Windows', 'macOS', 'iOS', 'Linux'],
    features: [
      'Protection against phishing, ransomware, and web-based attacks',
      'Set-and-forget protection',
      'Security overview across all protected endpoints',
      'Visibility into detected threats',
      'Enterprise-level protection at SMB pricing',
      'Easy deployment and management',
    ],
    trialDays: 30,
    basePrice: 299.99,
    price: {
      amount: 249.99,
      currency: 'USD',
      period: 'year',
    },
  }
];

export function getProductById(id: string): BitdefenderProduct | undefined {
  return MOCK_PRODUCTS.find(product => product.id === id);
}
