const Joi = require('@hapi/joi');

exports.loginValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        email: Joi.string().required().email(),
        password: Joi.string().required(),
        is_browser: Joi.boolean().required(),
        is_mobile: Joi.boolean().required(),
        ip: Joi.string().required(),
        country: Joi.string().required(),
        os: Joi.string().allow('').optional(),
        os_byte: Joi.string().allow('').optional(),
        browser: Joi.string().allow('').optional(),
        browser_version: Joi.string().allow('').optional(),
        city: Joi.string().allow('').optional(),
        region: Joi.string().allow('').optional()
    }));

    return schema.validate(req, { abortEarly: false })
}

exports.otpValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        is_browser: Joi.boolean().required(),
        is_mobile: Joi.boolean().required(),
        ip: Joi.string().required(),
        country: Joi.string().required(),
        os: Joi.string().allow('').optional(),
        os_byte: Joi.string().allow('').optional(),
        browser: Joi.string().allow('').optional(),
        browser_version: Joi.string().allow('').optional(),
        city: Joi.string().allow('').optional(),
        region: Joi.string().allow('').optional(),
        otp: Joi.string().required(),
        is_app: Joi.boolean().optional()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.deviceValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        is_browser: Joi.boolean().required(),
        is_mobile: Joi.boolean().required(),
        is_app: Joi.boolean().optional(),
        ip: Joi.string().required(),
        country: Joi.string().required(),
        os: Joi.string().allow('').optional(),
        os_byte: Joi.string().allow('').optional(),
        browser: Joi.string().allow('').optional(),
        browser_version: Joi.string().allow('').optional(),
        city: Joi.string().allow('').optional(),
        region: Joi.string().allow('').optional()
    }));

    return schema.validate(req, { abortEarly: false });

}

exports.resendOtpValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        user_id: Joi.string().required(),
        type: Joi.string().required()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.forgetPasswordValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        email: Joi.string().required().email(),
        ip: Joi.string().allow('').optional()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.resetPasswordValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        password: Joi.string().required().min(8).max(30).regex(/^(?=.*?[Aa-zZ])(?=.*?[0-9]).{8,}$/).error(errors => {
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
        hash: Joi.string()
    }));

    return schema.validate(req, { abortEarly: false })
}

exports.changePasswordValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        g2f_code: Joi.string(),
        otp: Joi.string(),
        old_password: Joi.string().required(),
        password: Joi.string().required().min(8).max(30).regex(/^(?=.*?[Aa-zZ])(?=.*?[0-9]).{8,}$/).error(errors => {
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
    }));

    return schema.validate(req, { abortEarly: false })
}

exports.settingsValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        sms_auth: Joi.boolean().optional(),
        password: Joi.string().optional(),
        google_auth: Joi.boolean().optional(),
        google_secrete_key: Joi.string().optional(),
        mobile: Joi.number().optional(),
        mobile_code: Joi.number().optional(),
        anti_spoofing: Joi.boolean().optional(),
        anti_spoofing_code: Joi.string().optional(),
        white_list_address: Joi.boolean().optional(),
        g2f_code: Joi.string(),
        white_list_address: Joi.boolean().optional(),
        otp: Joi.string().optional(),
        type: Joi.string().optional()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.g2fSettingValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        password: Joi.string().required(),
        google_auth: Joi.boolean().required().allow(true, false),
        google_secrete_key: Joi.string(),
        g2f_code: Joi.string().required()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.favouriteValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        market: Joi.string().required()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.kycDetailsValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        first_name: Joi.string().required(),
        middle_name: Joi.string().optional().allow(''),
        surname: Joi.string().required(),
        date_of_birth: Joi.string().required(),
        address: Joi.string().required().max(100),
        g2f_code: Joi.string(),
        otp: Joi.string()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.apiKeyValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        type: Joi.string().required(),
        passphrase: Joi.string().alphanum().min(5).max(8),
        g2f_code: Joi.string().required()
    }));

    return schema.validate(req, { abortEarly: false });
}

exports.moveBalanceValidation = (req) => {
    let schema = Joi.object().keys(Object.assign({
        amount: Joi.number().required(),
        asset: Joi.string().required(),
        otp: Joi.string().required()
    }));
    
    return schema.validate(req, { abortEarly: false });
}