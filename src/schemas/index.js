import trustedClient from './trusted-client-schema';
import * as routedClient from './routed-client-schema';
import joi from 'joi';

function validate(obj, schema){
  const { error, value } = joi.validate(obj, schema, { abortEarly: false });
  if(error){
    throw error;
  }
  return value;
}

export default {
  validate,
  trustedClient,
  routedClient,
  requiredAny: name => joi.any().description(name).required(),
  requiredString: name => joi.string().description(name).required(),
  optionalString: name => joi.string().description(name).allow(null),
  requiredObject: (name, keys) => joi.object(keys).description(name).required(),
  optionalObject: (name, keys) => joi.object(keys).description(name).allow(null),
  requiredFunc: name => joi.func().description(name).required(),
  optionalFunc: name => joi.func().description(name).allow(null)
};
