import { expect } from 'chai';
import * as utils from '../utils';

describe('Utils', () => {
  describe('buildRedisOptions', () => {
    it('parses host parameters from provided url with protocol: redis', () => {
      const options = {
        url: 'redis://someUser:somePwd@some.host.com:12345'
      };

      const result = utils.buildRedisOptions(options);

      expect(result).to.containSubset({
        host: 'some.host.com',
        password: 'somePwd',
        port: 12345,
      });
    });

    it('parses host parameters from provided url with protocol: rediss', () => {
      const options = {
        url: 'rediss://someUser:somePwd@some.host.com:12345'
      };

      const result = utils.buildRedisOptions(options);

      expect(result).to.containSubset({
        host: 'some.host.com',
        password: 'somePwd',
        port: 12345,
      });
    });

    it('provides tls config to not reject unauthorized when providing url with protocol: rediss', () => {
      const options = {
        url: 'rediss://someUser:somePwd@some.host.com:12345'
      };

      const result = utils.buildRedisOptions(options);

      expect(result).to.containSubset({
        tls: {
          rejectUnauthorized: false,
        },
      });
    });

    it('provides tls config to not reject unauthorized when providing cert file', () => {
      const options = {
        url: 'rediss://someUser:somePwd@some.host.com:12345',
        cert: 'tests/fixtures/cert'
      };

      const result = utils.buildRedisOptions(options);

      expect(result).to.containSubset({
        tls: {
          rejectUnauthorized: false,
          ca: Buffer.from('fixture: cert'),
        },
      });
    });

    it('maps connection options to result', () => {
      const options = {
        host: 'someHost',
        port: 1234,
        db: 4,
        password: 'someSecret',
      };

      const result = utils.buildRedisOptions(options);

      expect(result).to.containSubset({
        host: 'someHost',
        port: 1234,
        db: 4,
        password: 'someSecret',
      });
    });
  });
});
