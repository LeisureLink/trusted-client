import { validate, requiredFunc, requiredString, requiredObject } from './schemas';

export default function TrustedUser(request, token) {
  validate(request, requiredFunc('request'));
  validate(token, requiredString('token'));

  return {
    request: (uri, options, callback) => {
      validate(options, requiredObject('options'));
      options.jwt = token;
      return request(uri, options, callback);
    }
  };
}
