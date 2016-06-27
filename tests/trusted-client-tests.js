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

  describe('argument checking', function(){
    it('should require a keyId', function(){
      expect(()=>TrustedClient({ key: privateKey })).to.throw();
    });
    it('should require a key', function(){
      expect(()=>TrustedClient({ keyId: 'test' })).to.throw();
    });
    it('should require a good logger', function(){
      expect(()=>TrustedClient({ keyId: 'test', key: privateKey, log: { } })).to.throw();
    });
    it('should work when valid options are given', function(){
      expect(()=>TrustedClient({ keyId: 'test', key: privateKey })).to.not.throw();
    });
    it('should work when valid logger is given', function(){
      expect(()=>TrustedClient({ keyId: 'test', key: privateKey, log: require('@leisurelink/skinny-event-loggins')() })).to.not.throw();
    });
  });

  describe('callback model', function() {
    let client;
    before(function(){
      client = TrustedClient({
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

    describe('passes user token', function() {
      it('withUser call', function() {
        return client.withUser(sampleToken).request(uri, { method: 'GET' })
          .then(({ statusCode, raw }) => {
            expect(statusCode).to.equal(200);

            expect(raw.headers['x-authentic-user']).to.eql(sampleToken);
          });
      });
      it('via options', function() {
        return client.request(uri, { method: 'GET', user: sampleToken })
          .then(({ statusCode, raw }) => {
            expect(statusCode).to.equal(200);

            expect(raw.headers['x-authentic-user']).to.eql(sampleToken);
          });
      });
    });

    describe('passes origin token', function() {
      it('withOrigin call', function() {
        return client.withOrigin(sampleToken).request(uri, { method: 'GET' })
          .then(({ statusCode, raw }) => {
            expect(statusCode).to.equal(200);

            expect(raw.headers['x-authentic-origin']).to.eql(sampleToken);
          });
      });
      it('via options', function() {
        return client.request(uri, { method: 'GET', origin: sampleToken })
          .then(({ statusCode, raw }) => {
            expect(statusCode).to.equal(200);

            expect(raw.headers['x-authentic-origin']).to.eql(sampleToken);
          });
      });
    });

    it('sends a correlation id', function(done) {
      return runInContext()
        .then(() => {
          var correlationId = domainCorrelation.getId();
          client.request(uri, { method: 'GET' })
            .then(function({ statusCode, raw }) {
              expect(statusCode).to.equal(200);
              expect(raw.headers['x-correlation-id']).to.equal(correlationId);
              done();
            }
          );
        });
    });
  });
});
