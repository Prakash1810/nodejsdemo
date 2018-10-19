const Joi       = require('Joi');
const UserTemp  = require('../db/user-temp');
const helpers = require('../helpers/helper.functions');

let registration = {};

registration.post = (req, res) => {
    if( req ) {
        UserTemp.create({
            email: req.body.email,
            password: req.body.password,
            referral_code: req.body.referral_code ? req.body.referral_code : null
        }, (err, user) => {
            if (err) {
                res.status(400).send(err);
            } else {
                res.status(200).send(
                        helpers.successFormat({
                            "message": 'We have sent a confirmation email to your registered email address. ${req.body.email}. Please follow the instructions in the email to continue.'
                        })
                    );
            }
        });
    }
};

registration.checkEmailiCount = (email) => {
    let retrunCount = 0;
    UserTemp
        .countDocuments({ email: email }, (count) => {
            retrunCount = count
        });
    return retrunCount;
}

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