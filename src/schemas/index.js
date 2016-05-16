import trustedClient from './trusted-client-schema';
import routedClient from './routed-client-schema';
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
  routedClient
};
