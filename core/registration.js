const Joi       = require('Joi');
const UserTemp  = require('../db/user-temp');
const Users     = require('../db/users');
const helpers   = require('../helpers/helper.functions');

let registration = {};

registration.post = (req, res, next) => {
    if( req ) {
        // check email address already exits in user temp collections
        UserTemp.checkEmail(req.body.email,res);

        // check email address already exits in user temp collections
        Users.checkEmail(req.body.email,res);

        UserTemp.create({
            email: req.body.email,
            password: req.body.password,
            referral_code: req.body.referral_code ? req.body.referral_code : null
        }, (err, user) => {
            if (err) {
                res.status(500).send(helpers.errorFormat({ message: err.message}))
                next()
            } else {
                let encryptedHash = helpers.encrypt(
                                    JSON.stringify({
                                        'id': user.id,
                                        'email':  req.body.email
                                    })
                                );

                res.status(200).send(helpers.successFormat({
                            'message': `We have sent a confirmation email to your registered email address. ${req.body.email}. Please follow the instructions in the email to continue.`,
                            'activation_link' : `http://localhost:3000/api/user/activation/${encryptedHash}`
                        }));
                next()
            }
        });
    }
};

registration.validate = (req) => {
    let schema = Joi.object().keys({
        email: Joi.string().required().email().options({
            language:{
                string:{
                    required: '{{label}} field is required',
                    email: 'Invalid {{label}} address.'
                }
            }
        }).label('email'),
        password: Joi.string().required().min(8).regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
            language:{
                string:{
                    required: '{{label}} field is required',
                    min: '{{label}} must be at least 8 characters with uppercase letters and numbers.',
                    regex: {
                        base: '{{label}} must be at least 8 characters with uppercase letters and numbers.'
                    }
                }
            }
        }).label('password'),
        password_confirmation: Joi.any().valid(Joi.ref('password')).required().label('password confirmation').options({ language: { any: { allowOnly: 'must match password' } } }),
        referral_code: Joi.string().optional()
    });

    return Joi.validate(req, schema, { abortEarly: false })
};

module.exports = registration;
