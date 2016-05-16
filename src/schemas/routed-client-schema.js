import joi from 'joi';

export const routeDefinitions = joi.object().pattern(/.*/, joi.string()).min(1).required();
