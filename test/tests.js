'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var expect = require('expect.js');
var http = require('http');
var signature = require('http-signature');
var trusted = require('../');

function print(it) {
  if (typeof (it) === 'string') {
    util.log(it);
  } else {
    util.log(util.inspect(it, false, 9));
  }
}

var log = {
  info: print,
  warning: print,
  error: print,
  debug: print
};

var port = process.env.TEST_PORT || 8888;

var privateKeyFile = path.normalize(process.env.HTTP_SIGNATURE_PEM || path.join(__dirname, './test-key.pem'));
var privateKey = fs.readFileSync(privateKeyFile);

var publicKeyFile = path.normalize(process.env.HTTP_SIGNATURE_PUB || path.join(__dirname, './test-key.pub'));
var publicKey = fs.readFileSync(publicKeyFile);

describe('TrustedClient', function() {
  var server;
  
  before(function(done) {
    server = http.createServer(function(req, res) {
      
      try {
        res.setHeader('Content-Type', 'text/plain');
        res.writeHead(200);
        res.end('hello goodbye');
      } catch (Exception) {


      }
    });
    server.listen(port);
    done();
  });
  
  after(function() {
    server.close();
  });
  
  it('can send request', function(done) {
    var uri = 'http://localhost:'.concat(port);
    var client = new trusted.TrustedClient({
      keyId: 'test',
      key: privateKey,
      log: log
    });
    client.request(uri, {
      method: 'GET'
    },
        function(err, res, body) {
      if (err) {
        return done(err);
      }
      expect(res.statusCode).to.be(200);
      done();
    }
    );
  });

});
