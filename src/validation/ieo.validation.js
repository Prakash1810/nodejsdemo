const Joi = require('joi');

exports.ieoTokenSale = (req) => {
    let schema = Joi.object().keys(Object.assign({
        asset: Joi.string().required(),
        amount: Joi.number().required(),
        total: Joi.number().required(),
    }));
    return schema.validate(req, { abortEarly: false })

}