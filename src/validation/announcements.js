const Joi = require('joi');

exports.notification = (req) => {
    let schema = Joi.object().keys(Object.assign({
        content_id: Joi.string().required(),
        type: Joi.string().required()
    }));
    return schema.validate(req, { abortEarly: false });
}