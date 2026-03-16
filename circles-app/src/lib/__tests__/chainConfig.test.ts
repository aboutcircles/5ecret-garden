import { describe, it, expect } from 'vitest';
import {
  gnosisChainConfig,
  chiadoChainConfig,
  getChainConfig,
  getChainId,
} from '$lib/shared/integrations/chain/chainConfig';

describe('chainConfig', () => {
  describe('gnosisChainConfig', () => {
    it('should have correct chain ID', () => {
      expect(gnosisChainConfig.id).toBe(100);
    });

    it('should have correct name', () => {
      expect(gnosisChainConfig.name).toBe('Gnosis');
    });

    it('should have correct native currency', () => {
      expect(gnosisChainConfig.nativeCurrency).toEqual({
        name: 'xDAI',
        symbol: 'xDAI',
        decimals: 18,
      });
    });

    it('should have RPC URLs configured', () => {
      expect(gnosisChainConfig.rpcUrls.default.http).toBeDefined();
      expect(gnosisChainConfig.rpcUrls.default.http.length).toBeGreaterThan(0);
    });
  });

  describe('chiadoChainConfig', () => {
    it('should have correct chain ID', () => {
      expect(chiadoChainConfig.id).toBe(10200);
    });

    it('should have correct name', () => {
      expect(chiadoChainConfig.name).toBe('Chiado');
    });

    it('should have correct native currency', () => {
      expect(chiadoChainConfig.nativeCurrency).toEqual({
        name: 'xDAI',
        symbol: 'xDAI',
        decimals: 18,
      });
    });

    it('should have RPC URLs configured', () => {
      expect(chiadoChainConfig.rpcUrls.default.http).toBeDefined();
      expect(chiadoChainConfig.rpcUrls.default.http.length).toBeGreaterThan(0);
    });
  });

  describe('getChainConfig', () => {
    it('should return gnosis config for gnosis network', () => {
      const config = getChainConfig('gnosis');
      expect(config.id).toBe(100);
      expect(config.name).toBe('Gnosis');
    });

    it('should return chiado config for chiado network', () => {
      const config = getChainConfig('chiado');
      expect(config.id).toBe(10200);
      expect(config.name).toBe('Chiado');
    });
  });

  describe('getChainId', () => {
    it('should return 100 for gnosis', () => {
      expect(getChainId('gnosis')).toBe(100);
    });

    it('should return 10200 for chiado', () => {
      expect(getChainId('chiado')).toBe(10200);
    });
  });
});
