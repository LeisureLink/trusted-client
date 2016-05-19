import { format } from 'util';
import extend from 'deep-extend';
import request from './monkey-patch-request';
import errors from '@leisurelink/http-equiv-errors';
import { trustedClient as trustedClientSchema, validate, requiredObject, requiredString, optionalFunc } from './schemas';
import { EventEmitter } from 'events';
import domainCorrelation from '@leisurelink/domain-correlation';
import TrustedUser from './trusted-user';
import defaultLogger from './logger';
import DeferredPromise from './deferred-promise';

export const DefaultSignedHeaders = {
  PATCH: ['host', 'date', 'request-line', 'content-length'],
  POST: ['host', 'date', 'request-line', 'content-length'],
  PUT: ['host', 'date', 'request-line', 'content-length'],
  GET: ['host', 'date', 'request-line'],
  DELETE: ['host', 'date', 'request-line']
};

function isJson(headers) {
  return headers['content-type'] && headers['content-type'].indexOf('application/json') === 0;
}

function forceJson(headers, body) {
  if (body && typeof (body) === 'string' && isJson(headers)) {
    return JSON.parse(body);
  }
  return body;
}

function setRequestHeader(options, header, value) {
  validate(options, requiredObject('options'));
  validate(header, requiredString('header'));
  options.headers = options.headers || {};
  options.headers[header] = value;
}

const extendErrorWithResponseFields = (err, res) => {
  if (res) {
    if (!err.statusCode) { // http-equiv-errors already sets this as a read-only property
      err.statusCode = res.statusCode;
    }
    err.body = res.body;
    err.raw = res;
  }
  return err;
};

class ResponseError extends Error {
  constructor (res, body) {
    super(res);
    this.statusCode = res.statusCode;
    this.raw = res;
    this.body = body;
  }
}

/**
 * Trusted Client
 * @public
 * @constructor
 * @param {object} options
 * @param {string} options.keyId
 * @param {object} options.key
 * @type {object}
 *
 * @property {function} log
 *  @param kind
 *  @param message
 */
export default function TrustedClient(options) {
  validate(options, trustedClientSchema);

  const keyId = options.keyId;
  const key = options.key;
  const errorStatus = options.errorStatus;
  const signedHeaders = options.signedHeaders || DefaultSignedHeaders;
  const eventSink = new EventEmitter();
  const logger = options.log || defaultLogger;

  const handleResponse = (deferred) => {
    return (err, res, body) => {
      if (err) {
        return deferred.reject(err);
      }
      return deferred.resolve({
        statusCode: res.statusCode,
        body: body,
        raw: res
      });
    };
  };

  const handleResponseWithMetrics = (uri, options, callback, deferred) => {
    const hrstart = process.hrtime();
    return (responseError, res, responseBody) => { // eslint-disable-line
      const hrend = process.hrtime(hrstart);

      let body = responseBody;
      let error = responseError;

      const evt = {
        hrtime: hrend,
        timing: format('%ds %dms', hrend[0], hrend[1] / 1000000),
        request: {
          method: options.method,
          uri: uri
        },
        response: {}
      };
      if (res) {
        evt.response.statusCode = res.statusCode;
        let obj = forceJson(res.headers, body);
        if (obj) {
          body = obj;
        }
      }
      evt.response.body = body;

      let minStatusForError = options.errorStatus || errorStatus;
      // if the response is an error and json, revive the error to its object type...
      if (typeof (body) === 'object' && res.statusCode > 299 && body.statusCode && res.statusCode == body.statusCode) { //eslint-disable-line
        error = errors.reviveRemoteError(body);
      }
      // if the caller prefers an error response above a certain status code, give it to them
      else if (minStatusForError && res.statusCode >= minStatusForError) {
        error = new ResponseError(res, body);
      }
      if (error) {
        if (error.code === 'ECONNREFUSED') {
          error = new errors.ServiceUnavailableError(`Could not connect to service at ${uri}`, error);
        }
        evt.response.error = error;
        eventSink.emit('time', evt);
        logger.debug(evt);
        if (callback) {
          return callback(extendErrorWithResponseFields(error, res));
        }
        return deferred.reject(extendErrorWithResponseFields(error, res));
      }
      eventSink.emit('time', evt);
      logger.debug(evt);
      if (callback) {
        return callback(null, res, body);
      }
      return deferred.resolve({
        statusCode: res.statusCode,
        body: body,
        raw: res
      });
    };
  };

  const makeRequest = (uri, options, callback) => { // eslint-disable-line
    validate(uri, requiredString('uri'));
    validate(options, requiredObject('options'));
    validate(callback, optionalFunc('callback'));

    options.uri = uri;

    let correlationId = domainCorrelation.getId();
    if (correlationId) {
      setRequestHeader(options, 'X-Correlation-Id', correlationId);
    }

    if (!options.headers || !options.headers.accept) {
      setRequestHeader(options, 'accept', 'application/json, text/plain;q=0.9, text/html;q=0.8');
    }

    // Ensure the request bears an http signature; replaces existing
    // options.httpSignature if the caller specified one.
    const sig = {
      keyId: keyId,
      key: key,
      headers: signedHeaders[options.method]
    };
    if (options.json && options.json !== true) {
      options.body = JSON.stringify(options.json);
      delete options.json;
      setRequestHeader(options, 'content-type', 'application/json');
      setRequestHeader(options, 'content-length', Buffer.byteLength(options.body));
    }
    if (options.jwt) {
      sig.jwt = options.jwt;
    }
    options = extend({
      httpSignature: sig
    }, options);

    let deferred = DeferredPromise();

    let handler;
    if (!options.direct) {
      handler = handleResponseWithMetrics(uri, options, callback, deferred);
    } else if (callback) {
      handler = callback;
    } else {
      handler = handleResponse(deferred);
    }

    request(options, handler);
    if (callback) {
      return undefined;
    }
    return deferred.promise;
  };

  const withToken = (token) => {
    validate(token, requiredString('token'));
    return TrustedUser(makeRequest, token);
  };

  let module = {
    request: makeRequest,
    bindToken: withToken,
    withToken,
    on: (event, handler) => {
      eventSink.on(event, handler);
    },
    once: (event, handler) => {
      eventSink.once(event, handler);
    }
  };

  // deprecated
  if (this) {
    logger.warn('Deprecated - trusted client should not be called with "new"');
  }

  return module;
};
