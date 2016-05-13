import { readFileSync } from 'fs';
import path from 'path';
import { expect } from 'chai';
import createServer, { uri, defaultResponse } from './echo-server';
import { TrustedClient } from '../src';
import domainCorrelation from '@leisurelink/domain-correlation';
import jwt from 'jwt-simple';
import Promise from 'bluebird';

const runInContext = Promise.promisify(domainCorrelation.domainContext.run);

const privateKeyFile = path.normalize(process.env.HTTP_SIGNATURE_PEM || path.join(__dirname, './test-key.pem'));
const privateKey = readFileSync(privateKeyFile);

const sampleToken = jwt.encode({ foo: 'bar' }, 'some-secret');

describe('TrustedClient', function() {
  let server;

  before(function() {
    server = createServer();
  });

  after(function() {
    server.close();
  });

  describe('deprecated functionality', function() {
    let client;
    before(function(){
      client = new TrustedClient({
        keyId: 'test',
        key: privateKey
      });
    });

    it('can request with a callback', function(done) {
      client.request(uri, { method: 'GET' },
        function(err, res, body) {
          if (err) {
            done(err);
          }
          expect(res.statusCode).to.equal(200);
          expect(res.headers['x-received-correlation-id']).to.equal(undefined);
          expect(body).to.deep.equal(defaultResponse);
          done();
        }
      );
    });

    it('can request with a direct callback', function(done) {
      client.request(uri, { method: 'GET', direct: true },
        function(err, res, body) {
          if (err) {
            done(err);
          }
          expect(res.statusCode).to.equal(200);
          expect(res.headers['x-received-correlation-id']).to.equal(undefined);
          expect(body).to.equal(JSON.stringify(defaultResponse));
          done();
        }
      );
    });

    it('can bind to a jwt token with bindToken', function(done) {
      client.bindToken(sampleToken).request(uri, { method: 'GET' },
        function(err, res) {
          if (err) {
            done(err);
          }
          expect(res.statusCode).to.equal(200);
          let signature = JSON.parse(res.headers['x-parsed-signature']);

          expect(signature.params.jwt).to.eql(sampleToken);
          done();
        }
      );
    });
  });

  describe('#request', function() {
    let client;
    before(function(){
      client = TrustedClient({
        keyId: 'test',
        key: privateKey
      });
    });

    it('signs request', function() {
      return client.request(uri, { method: 'GET' })
        .then(({ statusCode, raw }) => {
          expect(statusCode).to.equal(200);

          let signature = JSON.parse(raw.headers['x-parsed-signature']);

          expect(signature.params.keyId).to.eql('test');
        });
    });

    it('signs request with jwt', function() {
      return client.withToken(sampleToken).request(uri, { method: 'GET' })
        .then(({ statusCode, raw }) => {
          expect(statusCode).to.equal(200);

          let signature = JSON.parse(raw.headers['x-parsed-signature']);

          expect(signature.params.jwt).to.eql(sampleToken);
        });
    });

    it('sends a correlation id', function(done) {
      return runInContext()
        .then(() => {
          var correlationId = domainCorrelation.getId();
          client.request(uri, { method: 'GET' })
            .then(function({ statusCode, raw }) {
              expect(statusCode).to.equal(200);
              expect(raw.headers['x-received-correlation-id']).to.equal(correlationId);
              done();
            }
          );
        });
    });
  });
});
