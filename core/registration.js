const express   = require('express');
const mongoose  = require("mongoose");
const Joi       = require('Joi');
const UserTemp  = require('../db/user-temp');

let registration = {};

registration.post = (req) => {
    if( req ) {
        return req.body;
    }
};

registration.validate = (req) => {
    let schema = Joi.object().keys({
        email: Joi.string().required().email().label('Email'),
        password: Joi.string().required().min(8).regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/),
        referral_code: Joi.string()
    });

    return Joi.validate(req, schema, { abortEarly: false });
};

module.exports = registration;