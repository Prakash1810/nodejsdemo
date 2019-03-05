const Joi           = require('joi');
const Users         = require('../db/users');
const Controller    = require('../core/controller');
const helpers       = require('../helpers/helper.functions');

class Password extends Controller {
    validate (req) {
        let emailReg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        let schema = Joi.object().keys({
            email: Joi.string().required().regex(emailReg).options({
                language: {
                    string: {
                        required: '{{label}} is required',
                        regex: {
                            base: 'Invalid {{label}} address.'
                        }
                    }
                }
            }).label('email')
        });

        return Joi.validate(req, schema, { abortEarly: false });
    }

    encryptHash (email) {
        let datetime = new Date();
        let data     = {
            'email': email,
            'datetime' : datetime
        };

        return helpers.encrypt(data);
    }   
}

module.exports = new Password;