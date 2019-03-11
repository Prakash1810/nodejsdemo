const Users         = require('../db/users');
const UserTemp      = require('../db/user-temp');
const helpers       = require('../helpers/helper.functions');
const config        = require('config');
const jwt           = require('jsonwebtoken');
const Joi           = require('joi');
const bcrypt        = require('bcrypt');
const Controller    = require('../core/controller');

class User extends Controller {

    activate (req, res) {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash));
        if (userHash.id) {
            UserTemp.findById(userHash.id)
            .exec((err, result) => {
                if (result) {
                    this.insertUser(result, res)
                } else {
                    return res.status(400).send(this.errorFormat({
                        'message': 'Invalid token. may be token as expired!'
                    }));
                }
            });
        } else {
            return res.status(500).send(this.errorFormat({
                'message': 'invalid token.'
            }));
        }
    }

    insertUser (result, res) {
        Users.create({
            email: result.email,
            password: result.password,
            referral_code: result.referral_code,
            created_date: result.created_date
        }, (err) => {
            if (err) {
                return res.status(500).send(this.errorFormat(err))
            } else {
                if (UserTemp.removeUserTemp(result.id)) {
                    return res.status(200).send(this.successFormat({
                        'message': `Congratulation!, Your account has been activated.`
                    }));
                } else {
                    return res.status(400).send(this.errorFormat({
                        'message': 'Invalid token. may be token as expired!'
                    }));
                }
            }
        });
    }

    createToken (user) {
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

    login (req, res) {
        Users.findOne({ email: req.body.email })
        .exec()
        .then((result) => {
            if (!result) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid credentials'
                }));
            }

            let passwordCompare = bcrypt.compareSync(req.body.password, result.password);
            if (passwordCompare == false) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid credentials'
                }));
            } else {
                return res.status(200).send(this.successFormat({
                    "token": this.createToken(result),
                    "created_at": Date.now()
                }, result._id));
            }
        });
    }
    
    validate (req) {
        let emailReg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        let schema = Joi.object().keys({
            email: Joi.string().required().regex(emailReg).options({
                language: {
                    string: {
                        required: '{{label}} field is required',
                        regex: {
                            base: 'Invalid {{label}} address.'
                        }
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

        return Joi.validate(req, schema, { abortEarly: false });
    }

    async removeUser  (email, res) {
        await Users.deleteOne({ email: email })
                .then(result => {
                    if (result.deletedCount) {
                        return res.status(200).send(this.successFormat({
                            'message': 'account deleted successfully!'
                        }));
                    } else {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Invalid email address'
                        }));    
                    }
                })
                .catch(err => {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid credentials'
                    }));
                });
    }

    getTokenToUserId (req, res) {
        let token = req.headers.authorization;
        jwt.verify(token, config.get('secrete.key'), function(err, decoded) {
            if (err) {
                return res.status(401).json(controller.errorMsgFormat({
                    message: "Invalid authentication"
                }));
            } else {
                return res.status(200).json({"code": 0, "message": null, "data": {"user_id": 1}});
            }
        });
    }
}

module.exports = new User;