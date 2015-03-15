'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var expect = require('expect.js');
var http = require('http');
var signature = require('http-signature');
var errors = require('http-equiv-errors');
var trusted = require('../');

var format = util.format;
var success = trusted.success;

function print(it) {
  if (typeof (it) === 'string') {
    util.log(it);
  } else {
    util.log(util.inspect(it, false, 9));
  }
}

function mockHttpCall(err, statusCode, callback) {
  process.nextTick(function mochHttpResponse() {
    if (err) return callback(err);
    var body;
    if (statusCode !== 204) {
      body = format('response: %s', statusCode);
    }
    callback(null, {
      statusCode: statusCode,
      body: body
    }, body);
  });
}

describe('#success', function() {

  it('expecting 200 receives 200 - succeeds',
      function(done) {
    var expected = {
      200: function(res, body) {
        try {
          expect(res.statusCode).to.be(200);
          expect(body).to.be('response: 200');
          done();
        } catch (err) {
          done(err);
        }
      }
    };
    mockHttpCall(null, 200,
          success(expected)
    );
  });

  it('expecting 200, 201 receives 201 - succeeds',
      function(done) {
    var expected = {
      200: function(res, body) {
        done(new Error('not expected'));
      },
      201: function(res, body) {
        try {
          expect(res.statusCode).to.be(201);
          expect(body).to.be('response: 201');
          done();
        } catch (err) {
          done(err);
        }
      }

    };
    mockHttpCall(null, 201,
          success(expected)
    );
  });

  it('expecting 201 with error handler, receives 500; error handler receives UnexpectedResponseError',
      function(done) {
    var expected = {
      201: function(res, body) {
        try {
          expect(res.statusCode).to.be(201);
          expect(body).to.be('response: 201');
          done();
        } catch (err) {
          done(err);
        }
      }
    };
    mockHttpCall(null, 500,
          success(expected)
          .error(
      function(err) {
        expect(err).to.be.an(errors.UnexpectedResponseError);
        done();
      })
    );
  });

  it('expecting 204 with unexpected handler, receives 400; unexpected handler receives UnexpectedResponseError',
      function(done) {
    var expected = {
      204: function(res, body) {
        try {
          expect(res.statusCode).to.be(204);
          done();
        } catch (err) {
          done(err);
        }
      }
    };
    mockHttpCall(null, 400,
          success(expected)
          .unexpected(
      function(err) {
        expect(err).to.be.an(errors.UnexpectedResponseError);
        done();
      })
    );
  });

  it('expecting 204 with unexpected handler and error handler, receives 400; unexpected handler receives UnexpectedResponseError',
      function(done) {
    var expected = {
      204: function(res, body) {
        try {
          expect(res.statusCode).to.be(204);
          done();
        } catch (err) {
          done(err);
        }
      }
    };
    mockHttpCall(null, 400,
          success(expected)
          .error(done)
          .unexpected(
      function(err) {
        expect(err).to.be.an(errors.UnexpectedResponseError);
        done();
      })
    );
  });
});
