import assert from 'assert-plus';

export default function TrustedUser(request, token) {
  assert.func(request, 'request');
  assert.string(token, 'token');

  return {
    request: (uri, options, callback) => {
      assert.object(options, 'options');
      options.jwt = token;
      return request(uri, options, callback);
    }
  };
}
