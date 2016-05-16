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
  requiredAny: name => joi.any().label(name).required(),
  requiredString: name => joi.string().label(name).required(),
  optionalString: name => joi.string().label(name).allow(null),
  requiredObject: (name, keys) => joi.object(keys).label(name).required(),
  optionalObject: (name, keys) => joi.object(keys).label(name).allow(null),
  requiredFunc: name => joi.func().label(name).required(),
  optionalFunc: name => joi.func().label(name).allow(null)
};
