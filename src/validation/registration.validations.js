const Joi = require('joi');

exports.registrationValidation = (req) => {
    let schema = Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required().min(8).max(20).regex(/^(?=.*[A-Z])(?=.*\d).{8,20}$/).error(errors => {
            errors.forEach(err => {
                switch (err.code) {
                    case "string.pattern.base":
                        err.message = 'The password must be a minimum of 8 characters. Use a combination of alphanumeric characters and uppercase letters.';
                        break;
                }
            })
            return errors
        }),
        password_confirmation: Joi.any().valid(Joi.ref('password')).required().error(errors => {
            errors.forEach(err => {
                switch (err.code) {
                    case "any.only":
                        err.message = 'The password you entered do not match.';
                        break;
                }
            })
            return errors
        }),
        referrer_code: Joi.string().allow('').optional()
    });

    return schema.validate(req, { abortEarly: false })
}