const Joi       = require('Joi');
const UserTempModel  = require('../db/user-temp');

let registration = {};

registration.post = (req) => {
    if( req ) {
        new User({
            email: req.body.email,
            password: req.body.password,
            referral_code: req.body.referral_code ? req.body.referral_code : null
        })
        .save()
        .then(result => {
            res.status(200).send({ "message":"user registred successfully"});
        })
        .catch(err => {
             res.status(400).send({"message":err.message});
        });
    }
};

registration.checkEmailiCount = (email) => {
    let retrunCount = 0;
    UserTempModel
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
        referral_code: Joi.string()
    });

    return Joi.validate(req, schema, { abortEarly: false })
};

module.exports = registration;