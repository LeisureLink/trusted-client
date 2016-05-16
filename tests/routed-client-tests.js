import { readFileSync } from 'fs';
import path from 'path';
import { expect } from 'chai';
import createServer, { uri, defaultResponse } from './echo-server';
import { TrustedClient, RoutedClient, AbstractClient } from '../src';

const privateKeyFile = path.normalize(process.env.HTTP_SIGNATURE_PEM || path.join(__dirname, './test-key.pem'));
const privateKey = readFileSync(privateKeyFile);

const routeDefinitions = {
  root: '/',
  oneParam: '/prefix/{param1}',
  twoParams: '/prefix/{param1}/{param2}'
};

describe('RoutedClient', function() {
  let server;
  let trustedClient;

  before(function() {
    server = createServer();
    trustedClient = TrustedClient({
      keyId: 'test',
      key: privateKey
    });
  });

  after(function() {
    server.close();
  });

  describe('deprecated functionality', function(){
    it('should be constructable', function(){
      let client = new AbstractClient(uri, trustedClient, routeDefinitions);
      return client.get('root')
        .then(({ statusCode, raw, body }) => {
          expect(statusCode).to.equal(200);
          expect(raw.headers['x-requested-url']).to.equal('/');
          expect(body).to.deep.equal(defaultResponse);
        });
    });

  });

  describe('#get', function(){
    let client;
    before(function(){
      client = RoutedClient(uri, trustedClient, routeDefinitions);
    });

    it('should be able to request with no params', function() {
      return client.get('root')
        .then(({ statusCode, raw, body }) => {
          expect(statusCode).to.equal(200);
          expect(raw.headers['x-requested-url']).to.equal('/');
          expect(body).to.deep.equal(defaultResponse);
        });
    });

    it('should be able to request with one param', function() {
      return client.get('oneParam', { param1: 'value1' })
        .then(({ statusCode, raw, body }) => {
          expect(statusCode).to.equal(200);
          expect(raw.headers['x-requested-url']).to.equal('/prefix/value1');
          expect(body).to.deep.equal(defaultResponse);
        });
    });

    it('should be able to request with two params', function() {
      return client.get('twoParams', { param1: 'value1', param2: 'value2' })
        .then(({ statusCode, raw, body }) => {
          expect(statusCode).to.equal(200);
          expect(raw.headers['x-requested-url']).to.equal('/prefix/value1/value2');
          expect(body).to.deep.equal(defaultResponse);
        });
    });
  });

  describe('#post', function(){
    let client;
    let sampleRequest = { hello: 'there' };
    before(function(){
      client = RoutedClient(uri, trustedClient, routeDefinitions);
    });

    it('should be able to request with no params', function() {
      return client.post('root', {}, sampleRequest)
        .then(({ statusCode, raw, body }) => {
          expect(statusCode).to.equal(200);
          expect(raw.headers['x-requested-url']).to.equal('/');
          expect(body).to.deep.equal(sampleRequest);
        });
    });

    it('should be able to request with one param', function() {
      return client.post('oneParam', { param1: 'value1' }, sampleRequest)
        .then(({ statusCode, raw, body }) => {
          expect(statusCode).to.equal(200);
          expect(raw.headers['x-requested-url']).to.equal('/prefix/value1');
          expect(body).to.deep.equal(sampleRequest);
        });
    });

    it('should be able to request with two params', function() {
      return client.post('twoParams', { param1: 'value1', param2: 'value2' }, sampleRequest)
        .then(({ statusCode, raw, body }) => {
          expect(statusCode).to.equal(200);
          expect(raw.headers['x-requested-url']).to.equal('/prefix/value1/value2');
          expect(body).to.deep.equal(sampleRequest);
        });
    });
  });
});
