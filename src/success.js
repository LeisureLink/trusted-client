import errors from '@leisurelink/http-equiv-errors';
import util from 'util';

// deprecated

const formatUnexpectedResponseErrorMessage = (res, body) => {
  var message = 'The server sent an unexptected response';
  if (res && res.statusCode) {
    message = message.concat(': ', res.statusCode);
  }
  if (body && body.cause) {
    if (typeof(body.cause) === 'string') {
      message = message.concat('; ', body.cause);
    } else if (typeof(body.cause) === 'object') {
      message = message.concat('; ', util.inspect(body.cause, false, 9));
    }
  }
  return message + '.';
};

export default function success(expected) {
  let behaviors = {};
  let fn = (err, res, body) => { // eslint-disable-line
    if (err) {
      if (behaviors.onErr) {
        behaviors.onErr(err);
        return;
      }
      throw err;
    }
    let code = res.statusCode;
    if (typeof(expected[code]) === 'function') {
      expected[code](res, body);
      return;
    }
    let msg = formatUnexpectedResponseErrorMessage(res, body);
    let unexpected = new errors.UnexpectedResponseError(msg, errors.reviveRemoteError(body));
    let otherwise = behaviors.onUnexpected || behaviors.onErr;
    if (otherwise) {
      otherwise(unexpected);
      return;
    }
    throw unexpected;
  };
  fn.unexpected = function(cb) {
    behaviors.onUnexpected = cb;
    return fn;
  };
  fn.otherwise = function(cb) {
    behaviors.onErr = cb;
    return fn;
  };
  fn.error = fn.otherwise;
  return fn;
};
