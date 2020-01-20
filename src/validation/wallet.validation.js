const Joi = require('@hapi/joi');

exports.postWithdrawAddressValidation = (req) => {
    let schema = Joi.object().keys({
        asset: Joi.string().required(),
        address: Joi.string().required(),
        label: Joi.string().required(),
        coin: Joi.string().required(),
        is_whitelist: Joi.boolean().optional(),
        g2f_code: Joi.string(),
        otp: Joi.string().optional()
    });

    return schema.validate(req, { abortEarly: false });
}

exports.postWithdrawValidation = (req) => {
    let schema = Joi.object().keys({
        asset: Joi.string().required(),
        amount: Joi.number().positive().required(),
        ip: Joi.string().required(),
        g2f_code: Joi.string(),
        otp: Joi.string(),
        address: Joi.string(),
        withdraw_id: Joi.string(),
        payment_id: Joi.string()
    });

    return schema.validate(req, { abortEarly: false });
}

exports.patchWithdrawConfirmationValidation = (req) => {
    let schema = Joi.object().keys({
        accept: Joi.boolean().required(),
        ip: Joi.string().required()
    });

    return schema.validate(req, { abortEarly: false });
}