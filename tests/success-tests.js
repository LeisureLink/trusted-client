var util = require('util');
var expect = require('chai').expect;
var errors = require('@leisurelink/http-equiv-errors');
var trusted = require('../src');

var format = util.format;

function mockHttpCall(err, statusCode, callback) {
  process.nextTick(function mockHttpResponse() {
    if (err) {
      callback(err);
      return;
    }
    let body;
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
  var success = trusted.success;

  it('expecting 200 receives 200 - succeeds',
  function(done) {
    var expected = {
      200: function(res, body) {
        try {
          expect(res.statusCode).to.equal(200);
          expect(body).to.equal('response: 200');
          done();
        } catch (err) {
          done(err);
        }
      }
    };
    mockHttpCall(null, 200, success(expected));
  });

  it('expecting 200, 201 receives 201 - succeeds',
  function(done) {
    var expected = {
      200: function() {
        done(new Error('not expected'));
      },
      201: function(res, body) {
        try {
          expect(res.statusCode).to.equal(201);
          expect(body).to.equal('response: 201');
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
          expect(res.statusCode).to.equal(201);
          expect(body).to.equal('response: 201');
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
        expect(err).to.be.an.instanceof(errors.UnexpectedResponseError);
        done();
      })
    );
  });

  it('expecting 204 with unexpected handler, receives 400; unexpected handler receives UnexpectedResponseError',
  function(done) {
    var expected = {
      204: function(res) {
        try {
          expect(res.statusCode).to.equal(204);
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
        expect(err).to.be.an.instanceof(errors.UnexpectedResponseError);
        done();
      })
    );
  });

  it('expecting 204 with unexpected handler and error handler, receives 400; unexpected handler receives UnexpectedResponseError',
  function(done) {
    var expected = {
      204: function(res) {
        try {
          expect(res.statusCode).to.equal(204);
          done();
        } catch (err) {
          done(err);
        }
      }
    };
    mockHttpCall(null, 400,
      success(expected)
          .error(done)
          .unexpected(function(err) {
            expect(err).to.be.an.instanceof(errors.UnexpectedResponseError);
            done();
          }));
  });
});
