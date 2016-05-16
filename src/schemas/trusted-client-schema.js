import joi from 'joi';

export default joi.object({
  keyId: joi.string()
    .description('Endpoint id and key name, used to reference the key that requests are signed with')
    .example('some-api/self')
    .required(),
  key: joi.alternatives().try(joi.string(), joi.binary())
    .description('The private key for the api. This is for signing requests.')
    .example('-----BEGIN RSA PRIVATE KEY-----\naabbcc\n-----END RSA PRIVATE KEY-----\n')
    .required(),
  log: joi.object()
    .keys({
      error: joi.func().required(),
      warn: joi.func().required(),
      info: joi.func().required(),
      debug: joi.func().required()
    })
    .unknown(true)
    .description('Optional logger implementation')
    .optional()
})
.label('trusted-client');
