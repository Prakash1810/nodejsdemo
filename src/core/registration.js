const Joi           = require('joi');
const UserTemp      = require('../db/user-temp');
const Users         = require('../db/users');
const UserServices  = require('../services/users');
const Controller    = require('../core/controller');
const helpers       = require('../helpers/helper.functions');
const password      = require('../core/password');

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
                        referral_code: Joi.string().allow('').optional()
                    });
    
        return Joi.validate(req, schema, { abortEarly: false })
    }

    post (req, res) {
        // check email address already exits in user temp collections
        UserTemp.find({ email: req.body.data.attributes.email })
        .exec()
        .then(result => {

            if (result.length) {
                return res.status(400).send(this.errorFormat({ 'email': 'This email address already exits.' }));
            } else {
                // check email address already exits in user temp collections
                Users.find({email: req.body.data.attributes.email})
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
            email: req.body.data.attributes.email,
            password: req.body.data.attributes.password,
            referral_code: req.body.data.attributes.referral_code ? req.body.data.attributes.referral_code : null
        }, (err, user) => {
            if (err) {
                return res.status(500).json(this.errorFormat({ 'message': err.message }));
            } else {
                 // send activation email
                 this.sendActivationEmail(user);

                return res.status(200).json(this.successFormat({
                    'message': `We have sent a confirmation email to your registered email address. ${user.email}. Please follow the instructions in the email to continue.`,
                }, user._id));
            }
        });
    }

    sendActivationEmail (user) {
        let encryptedHash = helpers.encrypt(
            JSON.stringify({
                'id': user._id,
                'email': user.email
            })
        );

        // send email notification to the registered user
        let serviceData   = {
        'hash' : encryptedHash,
        "to_email": user.email,
        "subject": "Confirm Your Registration",
        "email_for": "registration"
        };
        
        UserServices.sendEmailNotification(serviceData);
    }
    
    resendEmail (req, res) {
        let requestedData = req.body.data.attributes;

        if ( requestedData.id !== undefined ) {
            if ( requestedData.type === 'registration' ) {
                UserTemp.findById(requestedData.id).exec()
                    .then((user) => {
                        if (user === null) {
                            return res.status(400).send(this.errorMsgFormat({ 'message': 'Invalid requested.' }));
                        } else {

                            // send activation email
                            this.sendActivationEmail(user);

                            return res.status(200).json(this.successFormat({
                                'message': `Mail sended successfully. ${user.email}. Please follow the instructions in the email to continue.`,
                            }, user._id));
                        }
                    });
            } else if (requestedData.type === 'forget-passwod' ) {
                password.sendResetLink(req, res);
            } else {
                return res.status(400).send(this.errorMsgFormat({ 'message': 'Invalid request.' }));
            }
        } else {
            return res.status(400).send(this.errorMsgFormat({ 'message': 'Invalid request.' }));
        }
    }

}

module.exports = new Registration;