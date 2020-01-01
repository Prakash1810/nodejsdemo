const Joi = require('@hapi/joi');
const UserTemp = require('../db/user-temp');
const Users = require('../db/users');
const apiServices = require('../services/api');
const Controller = require('../core/controller');
const helpers = require('../helpers/helper.functions');
const password = require('../core/password');
const moment = require('moment');
const mangHash = require('../db/management-hash');
const config = require('config');
const bcrypt = require('bcrypt');
const accountActive = require('../db/account-active');
const users = require('../db/users');

class Registration extends Controller {

    validate(req) {
        let schema = Joi.object().keys({
            email: Joi.string().required().email(),
            password: Joi.string().required().min(8).max(30).regex(/^(?=.*?[Aa-zZ])(?=.*?[0-9]).{8,}$/).error(errors=>{ 
                errors.forEach(err=>{  
                switch(err.code){
                    case "string.pattern.base":
                    err.message='The password must be a minimum of 8 characters. Use a combination of alphanumeric characters and uppercase letters.';
                    break;
                   }
                 })
               return errors
                }),
            password_confirmation: Joi.any().valid(Joi.ref('password')).required().error(errors=>{ 
                errors.forEach(err=>{
                switch(err.code){
                    case "any.only":
                    err.message='The password you entered do not match.';
                    break;
                   }
                 })
               return errors
                }),
            referrer_code: Joi.string().allow('').optional()
        });

        return schema.validate(req, { abortEarly: false })
    }

    post(req, res) {
        // check email address already exits in user temp collections
        UserTemp.find({ email: req.body.data.attributes.email })
            .exec()
            .then(async result => {

                let data = req.body.data.attributes;
                data.password = await helpers.decrypt(data.password, res);
                data.password_confirmation = await helpers.decrypt(data.password_confirmation, res);
                if (data.password === '' || data.password_confirmation === '') {
                    return res.status(400).send(this.errorMsgFormat({
                        message: 'Your request was not encrypted.'
                    }));
                }
                let index = data.email.indexOf('@');
                let check = await apiServices.DisposableEmailAPI(data.email.substring(index + 1));
                // if(!check.dns && !check.temporary){
                //    
                if (!check.dns) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Your registration was not completed since you are using an invalid/blocked domain'
                    }));
                }
                else if (!check.dns || check.temporary) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Your registration was not completed since you are using an invalid/blocked domain'
                    }));
                }
                if (result.length) {
                    let salt = await bcrypt.genSalt(10);
                    data.password = await bcrypt.hash(data.password, salt);
                    let isChecked = await accountActive.findOne({ email: data.email, type_for: 'register' });
                    if (isChecked) {

                        if (isChecked.count < config.get('accountActiveRegister.hmt')) {
                            await accountActive.findOneAndUpdate({ email: data.email, type_for: 'register' },
                                {
                                    $inc: {
                                        count: 1
                                    },
                                    create_date: moment().format('YYYY-MM-DD HH:mm:ss')
                                })
                        }
                        else if (isChecked.count > config.get('accountActiveRegister.hmt')) {
                            let date = new Date(isChecked.create_date);
                            let getSeconds = date.getSeconds() + config.get('accountActiveRegister.timeExpiry');
                            let duration = moment.duration(moment().diff(isChecked.create_date));
                            if (getSeconds > duration.asSeconds()) {
                                return res.status(400).send(this.errorMsgFormat({

                                    'message': 'Your account has been locked due to multiple registration attempts. Please try again after 2 hours!'
                                }));
                            }
                            else {

                                await accountActive.findOneAndUpdate({ email: data.email, type_for: 'register' }, { count: 0, create_date: moment().format('YYYY-MM-DD HH:mm:ss') });
                                let user = await UserTemp.findOneAndUpdate({ email: req.body.data.attributes.email }, {
                                    password: data.password
                                })
                                await this.sendActivationEmail(user, 'withoutResend');
                                return res.status(200).json(this.successFormat({
                                    'message': `We have sent a verification email to your registered email address ${data.email}. Please follow the instructions in the email to verify your account.`,
                                }, user._id));
                            }

                        }
                        else {
                            if (isChecked.count > config.get('accountActiveRegister.limit')) {
                                await accountActive.findOneAndUpdate({ email: data.email, type_for: 'register' },
                                    {
                                        $inc: {
                                            count: 1
                                        },
                                        create_date: moment().format('YYYY-MM-DD HH:mm:ss')
                                    })
                                let user = await UserTemp.findOneAndUpdate({ email: req.body.data.attributes.email }, {
                                    $set: {
                                        password: data.password
                                    }
                                })
                                await this.sendActivationEmail(user, 'withoutResend');
                                return res.status(202).send(this.successFormat({
                                    "message": `We have sent a verification email to your registered email address ${data.email}. Please follow the instructions in the email to verify your account.`,
                                    "warning": `Your are about to expend the maximum resend limit. ${config.get('accountActiveRegister.hmt') - isChecked.count + 1}  attempt${(config.get('accountActiveRegister.hmt') - isChecked.count) + 1 > 1 ? 's' : ''} left`,
                                }, user._id));
                            }
                        }


                    }
                    let user = await UserTemp.findOneAndUpdate({ email: req.body.data.attributes.email }, {
                        $set: {
                            password: data.password
                        }
                    })
                    await this.sendActivationEmail(user, 'withoutResend');
                    return res.status(200).json(this.successFormat({
                        'message': `We have sent a verification email to your registered email address ${data.email}. Please follow the instructions in the email to verify your account.`,
                    }, user._id));


                } else {
                    // check email address already exits in user temp collections
                    Users.find({ email: req.body.data.attributes.email })
                        .exec()
                        .then(result => {
                            if (result.length) {
                                return res.status(400).send(this.errorMsgFormat({ 'message': 'This email address already exists.' }));
                            }

                            return this.insertUser(req, res);
                        });
                }
            });

        return false;
    }

    async insertUser(req, res) {
        let data = req.body.data.attributes;
        if (data.referrer_code) {
            let check = await users.findOne({ referral_code: data.referrer_code });
            if (check) {
                if (!check.is_active) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'The referral code you entered is inactive. Please use a different referral code.'
                    }));
                }
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'The referral code you entered is invalid. Please enter a valid referral code.'
                }));

            }

        }
        UserTemp.create({
            email: data.email,
            password: data.password,
            referrer_code: data.referrer_code ? data.referrer_code : null,
            created_date: new Date()
        }, async (err, user) => {
            if (err) {

                return res.status(500).json(this.errorMsgFormat({ 'message': err.message }));
            } else {
                // send activation email
                let isChecked = await this.sendActivationEmail(user);

                if (isChecked) {
                    await new accountActive({
                        email: data.email,
                        type_for: 'register',
                    }).save();
                    return res.status(200).json(this.successFormat({
                        'message': `We have sent a verification email to your registered email address ${user.email}. Please follow the instructions in the email to verify your account.`,
                    }, user._id));
                }
            }
        });
    }

    async sendActivationEmail(user, type = "registration") {
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
        //check how to many time click a resend button
        await apiServices.sendEmailNotification(serviceData);
        if (type == 'withoutResend') {
            let checked = await mangHash.findOneAndUpdate({ email: user.email, is_active: false, type_for: "registration" })
            if (checked) {
                checked.hash = encryptedHash;
                checked.count = 1
                checked.created_date = moment().format('YYYY-MM-DD HH:mm:ss');
                checked.save();
            }
            else {
                await new mangHash({ email: user.email, hash: encryptedHash, type_for: "registration", created_date: moment().format('YYYY-MM-DD HH:mm:ss') }).save();
            }
        }
        else {
            let checkCount = await mangHash.findOne({ email: user.email, is_active: false, type_for: "registration" });
            if (checkCount) {
                let count = checkCount.count;
                await mangHash.findOneAndUpdate({ email: user.email, is_active: false, type_for: "registration" }, { hash: encryptedHash, count: ++count, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
            }
            else {
                await new mangHash({ email: user.email, hash: encryptedHash, type_for: "registration", created_date: moment().format('YYYY-MM-DD HH:mm:ss') }).save();
            }
        }

        return true;
    }

    resendEmail(req, res) {
        let requestedData = req.body.data.attributes;
        if (req.body.data.id !== undefined) {
            if (requestedData.type === 'registration') {
                UserTemp.findById(req.body.data.id).exec()
                    .then(async (user) => {
                        if (user) {
                            let checkCount = await mangHash.findOne({ email: user.email, is_active: false, type_for: "registration" });
                            if (checkCount) {

                                if (checkCount.count > config.get('site.hmtLink')) {
                                    await UserTemp.deleteOne({ email: user.email });
                                    await accountActive.deleteOne({ email: user.email, type_for: 'register' })
                                    await mangHash.findOneAndUpdate({ email: user.email, is_active: false, type_for: "registration" }, { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                                    return res.status(400).send(this.errorMsgFormat({
                                        'message': `You've exceeded the maximum email resend limit. Please login and verify your email to continue.`
                                    }, 'users', 400));
                                }
                                else {

                                    // send activation email
                                    let check = this.sendActivationEmail(user);
                                    if (check) {
                                        return res.status(200).json(this.successFormat({
                                            'message': `We have resent a verification email to your registered email address (${user.email}).`,
                                        }, user._id));
                                    }
                                }
                            }
                        }

                        else {
                            return res.status(400).send(this.errorMsgFormat({ 'message': 'Your email has been verified. Please login to continue .' }));
                        }
                    });
            } else if (requestedData.type === 'forget-password') {
                return password.forgetPasswordResend(req, res)
            } else {
                return res.status(400).send(this.errorMsgFormat({ 'message': 'Type not found.' }));
            }
        } else {
            return res.status(400).send(this.errorMsgFormat({ 'message': 'User ID not found.' }));
        }
    }

}

module.exports = new Registration;