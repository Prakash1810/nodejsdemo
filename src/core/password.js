const moment        = require('moment');
const Joi           = require('joi');
const Users         = require('../db/users');
const apiServices   = require('../services/api');
const Controller    = require('../core/controller');
const helpers       = require('../helpers/helper.functions');
const config        = require('config');
const bcrypt        = require('bcrypt');


class Password extends Controller {

    validate (req) {
        let emailReg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        let schema = Joi.object().keys({
            email: Joi.string().required().regex(emailReg).options({
                language: {
                    string: {
                        required: '{{label}} is required',
                        regex: {
                            base: 'Invalid {{label}} address.'
                        }
                    }
                }
            }).label('email'),
            ip: Joi.string().allow('').optional()
        });

        return Joi.validate(req, schema, { abortEarly: false });
    }

    encryptHash (email) {
        let timeNow     = moment().format('YYYY-MM-DD HH:mm:ss');
        let data     = JSON.stringify({
            'email': email,
            'datetime' : timeNow
        });

        return helpers.encrypt(data);
    }
    
    sendResetLink (req, res) {
        Users.findOne({
            email: req.body.data.attributes.email
        }).exec()
        .then( async (user) => {
                if (!user) {
                    return res.status(400).json(this.errorMsgFormat({ 'message': 'Invalid email address.' }));
            } else {
                let encryptedHash = this.encryptHash(user.email);
                
                // send email notification to the registered user
                let serviceData   = {
                    'hash' : encryptedHash,
                    'subject': `Password Reset - ${moment().format('YYYY-MM-DD HH:mm:ss')} (${config.get('settings.timeZone')})`,
                    'email_for': 'forget-password',
                    'user_id': user._id
                };

                await apiServices.sendEmailNotification(serviceData);

                return res.status(200).json(this.successFormat({
                            'message': 'We have sent a reset email to your email address. Please follow the instructions in the email to continue.',
                            'hash' : encryptedHash
                        }, user._id));
            }
        });
    }

    checkResetLink (req, res) {
            
        let userHash = JSON.parse(helpers.decrypt(req.params.hash));

        if ( userHash.email ) {
            let checkExpired = this.checkTimeExpired(userHash.datetime);
            if ( checkExpired ) {
                Users.findOne({ email: userHash.email })
                .exec()
                .then((result) => {
                    if (!result) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Invalid token. may be token as expired!'
                        }));
                    } else {
                        return res.status(200).send(this.successFormat({
                            'message': 'token is valid!'
                        },result._id));
                    }
                });
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'invalid token or token is expired.'
                }));
            }
        } else {
            return res.status(404).send(this.errorMsgFormat({
                'message': 'invalid token or token is Expired.'
            }));
        }
    }

    checkTimeExpired ( startDate ) {
        let duration    = moment.duration(moment().diff(startDate));

        // check expiry time in seconds
        if (config.get('settings.expiryTime') > duration.asSeconds()) {
            return true;
        }

        return false;
    }

    resetPasswordValidate (req) {
        let schema = Joi.object().keys({
                        password: Joi.string().required().regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
                            language:{
                                string:{
                                    required: '{{label}} field is required',
                                    regex: {
                                        base: '{{label}} must be at least 8 characters with uppercase letters and numbers.'
                                    }
                                }
                            }
                        }).label('password'),
                        password_confirmation: Joi.any().valid(Joi.ref('password')).required().label('password confirmation').options({ language: { any: { allowOnly: 'must match password' } } }),
                    });
    
        return Joi.validate(req, schema, { abortEarly: false })
    }

    resetPassword (req, res) {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) return res.status(404).send(this.errorMsgFormat({'message': 'Invalid user.' }));
            
            bcrypt.hash(req.body.data.attributes.password, salt, (err, hash) => {
                if (err) return res.status(404).send(this.errorMsgFormat({'message': 'Invalid user.' }));
                
                // find and update the reccord
                Users.findByIdAndUpdate(req.body.data.id, { password: hash }, (err, user) => {
                    if (user == null) {
                        return res.status(404).send(this.errorMsgFormat({'message': 'Invalid user.' }));
                    } else {
                        return res.status(202).send(this.successFormat({
                            'message': 'Your password updated successfully.'
                        }, user._id, 'users', 202));
                    }
                });
            });
        });
    }

    changePasswordValidate (req) {
        let schema = Joi.object().keys({
            old_password: Joi.string().required().regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
                language:{
                    string:{
                        required: '{{label}} field is required',
                        regex: {
                            base: '{{label}} must be at least 8 characters with uppercase letters and numbers.'
                        }
                    }
                }
            }).label('old_password'),
            password: Joi.string().required().regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
                language:{
                    string:{
                        required: '{{label}} field is required',
                        regex: {
                            base: '{{label}} must be at least 8 characters with uppercase letters and numbers.'
                        }
                    }
                }
            }).label('password'),
            password_confirmation: Joi.any().valid(Joi.ref('password')).required().label('password confirmation').options({ language: { any: { allowOnly: 'must match password' } } }),
        });

        return Joi.validate(req, schema, { abortEarly: false })
    }

    changePassword (req, res) {

        Users.findById(req.body.data.id)
        .exec()
        .then((result) => {
            if (!result) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid data'
                }));
            }

            // compare existing password
            let passwordCompare = bcrypt.compareSync(req.body.data.attributes.old_password, result.password);

            if (passwordCompare == false) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Incorrect old password'
                }));
            } else {

                // update password
                this.resetPassword(req, res);
            }
        });
    }
}

module.exports = new Password;