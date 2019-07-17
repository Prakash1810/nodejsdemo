const Joi = require('joi');
const UserTemp = require('../db/user-temp');
const Users = require('../db/users');
const apiServices = require('../services/api');
const Controller = require('../core/controller');
const helpers = require('../helpers/helper.functions');
const password = require('../core/password');
const moment = require('moment');
const mangHash = require('../db/management-hash');

class Registration extends Controller {

    validate(req) {
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
            password: Joi.string().required().min(8).regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
                language: {
                    string: {
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

    post(req, res) {
        // check email address already exits in user temp collections
        UserTemp.find({ email: req.body.data.attributes.email })
            .exec()
            .then(result => {
                if (result.length) {
                    return res.status(400).send(this.errorFormat({ 'email': 'This email address already exits.' }));
                } else {
                    // check email address already exits in user temp collections
                    Users.find({ email: req.body.data.attributes.email })
                        .exec()
                        .then(result => {
                            if (result.length) {
                                return res.status(400).send(this.errorFormat({ 'email': 'This email address already exits.' }));
                            }

                            return this.insertUser(req, res);
                        });
                }
            });

        return false;
    }

    insertUser(req, res) {
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

   async  sendActivationEmail(user,type="registration") {
        let encryptedHash = helpers.encrypt(
            JSON.stringify({
                'id': user._id,
                'email': user.email,
                'date': moment().format('YYYY-MM-DD HH:mm:ss')
            })
        );

        // send email notification to the registered user
        let serviceData = {
            'hash': encryptedHash,
            "to_email": user.email,
            "subject": "Confirm Your Registration",
            "email_for": "registration"
        };

        await apiServices.sendEmailNotification(serviceData);
        if(type == 'sendEmail'){
            await mangHash.findOneAndUpdate({ email: user.email, hash: encryptedHash, is_active: false, type_for: "registration" }, { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
        }
        let ischecked = await mangHash.findOneAndUpdate({ email: user.email, is_active: false, type_for: "registration" }, { hash: encryptedHash, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
        if (!ischecked) {
            await new mangHash({ email: user.email, hash: encryptedHash, type_for: "registration", created_date: moment().format('YYYY-MM-DD HH:mm:ss') }).save();
        }
       return 0;
    }

    resendEmail(req, res) {
        let requestedData = req.body.data.attributes;
        if (req.body.data.id !== undefined) {
            if (requestedData.type === 'registration') {
                UserTemp.findById(req.body.data.id).exec()
                    .then((user) => {
                        if (user === null) {
                            return res.status(400).send(this.errorMsgFormat({ 'message': 'Invalid request.' }));
                        } else {

                            // send activation email
                            this.sendActivationEmail(user,"sendEmail");

                            return res.status(200).json(this.successFormat({
                                'message': `Mail sended successfully. ${user.email}. Please follow the instructions in the email to continue.`,
                            }, user._id));
                        }
                    });
            } else if (requestedData.type === 'forget-password') {
                return password.sendResetLink(req, res);
            } else {
                return res.status(400).send(this.errorMsgFormat({ 'message': 'Invalid type request.' }));
            }
        } else {
            return res.status(400).send(this.errorMsgFormat({ 'message': 'Invalid request.' }));
        }
    }

}

module.exports = new Registration;