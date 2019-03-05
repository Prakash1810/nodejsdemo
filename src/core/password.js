const moment        = require('moment');
const Joi           = require('joi');
const Users         = require('../db/users');
const Controller    = require('../core/controller');
const helpers       = require('../helpers/helper.functions');


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
            }).label('email')
        });

        return Joi.validate(req, schema, { abortEarly: false });
    }

    encryptHash (email) {
        let timeNow     = moment();
        let data     = JSON.stringify({
            'email': email,
            'datetime' : timeNow
        });

        return helpers.encrypt(data);
    }
    
    sendResetLink (req, res) {
        Users.findOne({
            email: req.body.email
        }).exec()
        .then((user) => {
            if (!user) {
                return res.status(400).json(this.errorMsgFormat({ 'message': 'Invalid email address.' }));
            } else {
                let encryptedHash = this.encryptHash(user.email);

                return res.status(200).json(this.successFormat({
                            'message': `We have sent a reset email to your email address. Please follow the instructions in the email to continue.`,
                            'hash' : encryptedHash
                        }));
            }
        });
    }

    checkResetLink (req, res) {
        let userHash = JSON.parse(helpers.decrypt(req.params.hash));
        if (userHash.email) {
            let sendedDate  = moment(userHash.datetime,'DD.MM.YYYY HH:mm:ss');
            let timeNow     = moment().format('YYYY-M-DD HH:mm:ss');
            return res.send(sendedDate.diff(s));
            UserTemp.findByOne(userHash.email)
            .exec()
            .then((result) => {
                re
                if (!result ) {
                    return res.status(400).send(this.errorFormat({
                        'message': 'Invalid token. may be token as expired!'
                    }));
                } else {
                    return userHash;    
                }
            });
        } else {
            return res.status(500).send(this.errorFormat({
                'message': 'invalid token.'
            }));
        }
    }
}

module.exports = new Password;