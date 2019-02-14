const Users = require('../db/users');
const UserTemp = require('../db/user-temp');
const helpers = require('../helpers/helper.functions');
const config = require('config');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const bcrypt = require('bcrypt');

let user = {};

user.activate = (req, res) => {
    try {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash));
        UserTemp.findById(userHash.id)
            .exec()
            .then(result => {
                if (result) {
                    Users.create({
                        email: result.email,
                        password: result.password,
                        referral_code: result.referral_code,
                        created_date: result.created_date
                    }, (err) => {
                        if (err) {
                            return res.status(500).send(helpers.errorFormat(err))
                        } else {
                            if (UserTemp.removeUserTemp(result.id)) {
                                return res.status(200).send(helpers.successFormat({
                                    'message': `Congratulation!, Your account has been activated.`
                                }));
                            } else {
                                return res.status(400).send(helpers.errorFormat({
                                    'message': 'Invalid token. may be token as expired!'
                                }));
                            }
                        }
                    });
                } else {
                    return res.status(400).send(helpers.errorFormat({
                        'message': 'Invalid token. may be token as expired!'
                    }));
                }
            });
    } catch (err) {
        return res.status(500).send(helpers.errorFormat({
            'message': 'invalid token.'
        }));
    }
}

user.createToken = (user) => {
    let jwtOptions = {
        issuer: config.get('secrete.issuer'),
        subject: 'Authentication',
        audience: config.get('secrete.domain'),
        expiresIn: config.get('secrete.expiry'),
    };

    return jwt.sign({
        user: user._id
    }, config.get('secrete.key'), jwtOptions);
};

user.login = (req, res) => {
    try {
        Users.find({
                email: req.body.email
            })
            .exec()
            .then(result => {
                if (!result.length) {
                    return res.status(400).send(helpers.errorFormat({
                        'message': 'Invalid credentials'
                    }));
                }

                bcrypt.compare(req.body.password, result.password, function (err) {
                    if (err) {
                        return res.status(400).send(helpers.errorFormat({
                            'message': err.message
                        }));
                    }
                    return res.status(200).send(helpers.successFormat({
                        "token": user.createToken(user),
                        "created_at": Date.now()
                    }, result._id));
                })
            });
    } catch (err) {
        return res.status(500).send(helpers.errorFormat({
            'message': err.message
        }));
    }
}

user.validate = (req) => {
    let schema = Joi.object().keys({
        email: Joi.string().required().email().options({
            language: {
                string: {
                    required: '{{label}} field is required',
                    email: 'Invalid {{label}} address.'
                }
            }
        }).label('email'),
        password: Joi.string().required().options({
            language: {
                string: {
                    required: '{{label}} field is required',
                }
            }
        }).label('password')
    });

    return Joi.validate(req, schema, {
        abortEarly: false
    })
};

module.exports = user;