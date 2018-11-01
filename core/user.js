const Users     = require('../db/users');
const UserTemp  = require('../db/user-temp');
const helpers   = require('../helpers/helper.functions');
const config    = require('config');
const jwt       = require('jsonwebtoken');
const Joi       = require('Joi');
const bcrypt    = require('bcrypt');


let user = {};

user.activate = (req, res, next) => {
    try {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash));
        UserTemp.findById(userHash.id)
        .exec()
        .then(result => {
            if(result) {
                Users.create({
                    email: result.email,
                    password: result.password,
                    referral_code: result.referral_code,
                    created_date: result.created_date
                }, (err) => {
                    if (err) {
                        res.status(500).send(helpers.errorFormat(err.message))
                        next()
                    } else {
                        if(UserTemp.removeUserTemp(result.id)) {
                            res.status(200).send(helpers.successFormat({
                                'message': `Congratulation!, Your account has been activated.`
                            }));
                            next()
                        } else {
                            res.status(400).send(helpers.errorFormat({'message': 'Invalid token. may be sdasdtoken as expired!'}));
                            next()
                        }
                    }
                });
            } else {
                res.status(400).send(helpers.errorFormat({'message': 'Invalid token. may be token as expired!'}));
                next()
            }            
        });
    }
    catch (err) {
        res.status(500).send(helpers.errorFormat({'message': 'invalid token.'}));
        next()
    }
}

user.createToken = (user) => {
    let jwtOptions = {
        issuer:  config.get('secrete.issuer'),
        subject:  'Authentication',
        audience:  config.get('secrete.domain'),
        expiresIn:  config.get('secrete.expiry'),
    };

    return jwt.sign({ user: user._id }, config.get('secrete.key'), jwtOptions );
};

user.login = (req, res, next) => {
    try {
        Users.findOne({ email: req.body.email })
        .exec((err, result) => {
            if (err || result === null ) {
                res.status(400).send(helpers.errorFormat({ 'message': 'Invalid credentials' }));
                next()
            }

            bcrypt.compare(req.body.password, result.password, function(err) {
                if (err) {
                    res.status(400).send(helpers.errorFormat({ 'message': err.message }));
                    next()
                }
                res.status(200).send(helpers.successFormat({
                    "token": user.createToken(user),
                    "created_at": Date.now() 
                }, result._id ));
                next()
            })
        });
    }
    catch (err) {
        res.status(500).send(helpers.errorFormat({ 'message': err.message }));
        next()
    }	
}

user.validate = (req) => {
    let schema = Joi.object().keys({
        email: Joi.string().required().email().options({
            language:{
                string:{
                    required: '{{label}} field is required',
                    email: 'Invalid {{label}} address.'
                }
            }
        }).label('email'),
        password: Joi.string().required().options({
            language:{
                string:{
                    required: '{{label}} field is required',
                }
            }
        }).label('password')
    });

    return Joi.validate(req, schema, { abortEarly: false })
};

module.exports = user;
