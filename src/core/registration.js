const Joi           = require('joi');
const UserTemp      = require('../db/user-temp');
const Users         = require('../db/users');
const Controller    = require('../core/controller');
const config        = require('config');
const helpers       = require('../helpers/helper.functions');

class Registration extends Controller {
    validate (req) {
        let emailReg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        let schema = Joi.object().keys({
                        email: Joi.string().required().regex(emailReg).options({
                            language:{
                                string:{
                                    required: '{{label}} field is required',
                                    regex: {
                                        base: 'Invalid {{label}} address.'
                                    }
                                }
                            }
                        }).label('email'),
                        password: Joi.string().required().min(8).regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
                            language:{
                                string:{
                                    required: '{{label}} field is required',
                                    min: '{{label}} must be at least 8 characters with uppercase letters and numbers.',
                                    regex: {
                                        base: '{{label}} must be at least 8 characters with uppercase letters and numbers.'
                                    }
                                }
                            }
                        }).label('password'),
                        password_confirmation: Joi.any().valid(Joi.ref('password')).required().label('password confirmation').options({ language: { any: { allowOnly: 'must match password' } } }),
                        referral_code: Joi.string().optional()
                    });
    
        return Joi.validate(req, schema, { abortEarly: false })
    }

    post (req, res) {
        // check email address already exits in user temp collections
        UserTemp.find({ email: req.body.email })
        .exec()
        .then(result => {

            if (result.length) {
                return res.status(400).send(this.errorFormat({ 'email': 'This email address already exits.' }));
            } else {
                // check email address already exits in user temp collections
                Users.find({email: req.body.email})
                .exec()
                .then(result => {
                    if (result.length) {
                        return res.status(400).send(this.errorFormat({ 'email': 'This email address already exits.' }));
                    }
                    
                    this.insertUser(req, res);
                });
            }
        });

        return false;
    }

    insertUser (req, res) {
        UserTemp.create({
            email: req.body.email,
            password: req.body.password,
            referral_code: req.body.referral_code ? req.body.referral_code : null
        }, (err, user) => {
            if (err) {
                return res.status(500).json(this.errorFormat({ 'message': err.message }));
            } else {
                let encryptedHash = helpers.encrypt(
                                        JSON.stringify({
                                            'id': user.id,
                                            'email': req.body.email
                                        })
                                    );

                return res.status(200).json(this.successFormat({
                            'message': `We have sent a confirmation email to your registered email address. ${req.body.email}. Please follow the instructions in the email to continue.`,
                            'activation_link' : `${config.get('site.url')}/api/${config.get('site.version')}/user/activation/${encryptedHash}`
                        }));
            }
        });
    }
}

module.exports = new Registration;