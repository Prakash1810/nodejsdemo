const Joi = require('@hapi/joi');

exports.ieoTokenSale = (req) => {
    let schema = Joi.object().keys(Object.assign({
        currency_code: Joi.string().required(),
        amount: Joi.number().required(),
        total: Joi.number().required(),
    }));
    return schema.validate(req, { abortEarly: false })

}