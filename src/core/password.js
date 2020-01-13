const Joi = require('@hapi/joi');
const Users = require('../db/users');
const apiServices = require('../services/api');
const Controller = require('../core/controller');
const helpers = require('../helpers/helper.functions');
const config = require('config');
const bcrypt = require('bcrypt');
const mangHash = require('../db/management-hash');
const moment = require('moment');
const user = require('../core/user');
let checkHash = null;
class Password extends Controller {

    validate(req) {
        let schema = Joi.object().keys({
            email: Joi.string().required().email(),
            ip: Joi.string().allow('').optional()
        });

        return schema.validate(req, { abortEarly: false });
    }

    encryptHash(email, user) {
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
        let data = JSON.stringify({
            'email': email,
            'datetime': timeNow,
            'user': user

        });

        return helpers.encrypt(data);
    }


    sendResetLink(req, res) {

        Users.findOne({
            email: req.body.data.attributes.email
        }).exec()
            .then(async (user) => {
                if (!user) {
                    return res.status(400).json(this.errorMsgFormat({ 'message': 'User cannot be found. Please contact support.' }));
                } else {
                    let encryptedHash = this.encryptHash(user.email, user._id);

                    // send email notification to the registered user
                    let serviceData = {
                        'hash': encryptedHash,
                        'subject': `Password Reset - ${moment().format('YYYY-MM-DD HH:mm:ss')} (${config.get('settings.timeZone')})`,
                        'email_for': 'forget-password',
                        'user_id': user._id
                    };
                    await apiServices.sendEmailNotification(serviceData, res);
                    await mangHash.update({ email: user.email, is_active: false, type_for: "reset" }, { $set: { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') } })
                    await new mangHash({ email: user.email, hash: encryptedHash, type_for: "reset", created_date: moment().format('YYYY-MM-DD HH:mm:ss') }).save();
                    return res.status(200).json(this.successFormat({
                        'message': 'A password reset link has been sent to your registered email address. Please check your email to reset your password.',
                        'hash': encryptedHash
                    }, user._id));
                }
            });
    }
    async forgetPasswordResend(req, res) {
        let input = req.body.data;
        let user = await Users.findOne({ _id: input.id, email: input.attributes.email });
        if (user) {
            let ischecked = await mangHash.findOne({ email: user.email, is_active: false, type_for: "reset" })
            if (ischecked) {
                if (ischecked.count > config.get('site.hmtLink')) {
                    await mangHash.findOneAndUpdate({ email: user.email, is_active: false, type_for: "reset" }, { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                    return res.status(400).send(this.errorMsgFormat({
                        'message': `You have exceeded the maximum email resend request. Please click the 'Forgot Password' option to continue. `
                    }, 'users', 400));
                }
            }
            let encryptedHash = this.encryptHash(user.email, user._id);
            if (ischecked) {
                let count = ischecked.count;
                await mangHash.findOneAndUpdate({ email: user.email, is_active: false, type_for: "reset" }, { hash: encryptedHash, count: ++count, created_date: moment().format('YYYY-MM-DD HH:mm:ss') });
            }
            let serviceData = {
                'hash': encryptedHash,
                'subject': `Password Reset - ${moment().format('YYYY-MM-DD HH:mm:ss')} (${config.get('settings.timeZone')})`,
                'email_for': 'forget-password',
                'user_id': user._id
            };

            await apiServices.sendEmailNotification(serviceData, res);
            return res.status(200).json(this.successFormat({
                'message': 'A password reset link has been resent to your registered email address. Please check your email to reset your password.',
                'hash': encryptedHash
            }, user._id));

        }
        else {
            return res.status(400).send(this.errorMsgFormat({ 'message': 'User cannot be found. Please contact support.' }, 'user', 400));
        }



    }
    async checkResetLink(req, res) {


        let userHash = JSON.parse(helpers.decrypt(req.params.hash,res));
        let checkHash = await mangHash.findOne({ email: userHash.email, hash: req.params.hash });
        if (checkHash) {
            if (checkHash.is_active) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'The password reset link has already been used. Please login to continue.'
                }));
            }
            else {
                req.body.checkHash = checkHash;
                await this.resetPassword(req, res, 'hash');

            }
        }

        else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'The password reset link has expired. Please login to continue.'
            }));
        }
        if (userHash.email) {
            let checkExpired = this.checkTimeExpired(userHash.datetime);
            if (checkExpired) {
                Users.findOne({ email: userHash.email, _id: userHash.user })
                    .exec()
                    .then(async (result) => {
                        if (!result) {
                            return res.status(400).send(this.errorMsgFormat({
                                'message': "User cannot be found."
                            }));
                        } else {
                            return res.status(200).send(this.successFormat({
                                'message': 'The password reset link has been validated.'
                            }, result._id));
                        }
                    });
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'The password reset link has expired. Please login to continue.'
                }));
            }
        } else {
            return res.status(404).send(this.errorMsgFormat({
                'message': 'User cannot be found.'
            }));
        }
    }

    checkTimeExpired(startDate) {
        let date = new Date(startDate);
        let getSeconds = date.getSeconds() + config.get('activation.expiryTime');
        let duration = moment.duration(moment().diff(startDate));
        if (getSeconds > duration.asSeconds()) {
            return true;
        }
        return false;
    }

    resetPasswordValidate(req) {
        let schema = Joi.object().keys({
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
            hash: Joi.string()
        });

        return schema.validate(req, { abortEarly: false })
    }

    async resetPassword(req, res, type = 'reset') {

        if (type == 'hash') {
            checkHash = req.body.checkHash;
            return;
        }
        let data = req.body.data.attributes;
        data.password = await helpers.decrypt(data.password,res);
        data.password_confirmation = await helpers.decrypt(data.password_confirmation,res);
        if (data.password === '' || data.password_confirmation === '') {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Your request was not encrypted.'
            }));
        }
        const checkPassword = await Users.findById({ _id: req.body.data.id });
        let comparePassword = await bcrypt.compare(data.password, checkPassword.password);
        if (comparePassword) {
            return res.status(400).send(this.successFormat({
                'message': 'Please enter a password that you have not used before.'
            }, checkPassword._id, 'users', 400));

        }

        bcrypt.genSalt(10, (err, salt) => {
            if (err) return res.status(404).send(this.errorMsgFormat({ 'message': 'Invalid user.' }));

            bcrypt.hash(data.password, salt, (err, hash) => {
                if (err) return res.status(404).send(this.errorMsgFormat({ 'message': 'Invalid user.' }));


                // find and update the reccord
                Users.findByIdAndUpdate(req.body.data.id, { password: hash }, async (err, user) => {
                    if (user == null) {
                        return res.status(404).send(this.errorMsgFormat({ 'message': 'Invalid user.' }));
                    } else {

                        if (type == 'change') {
                            let serviceData =
                            {
                                subject: `Beldex Change Password From ${data.email} - ${moment().format('YYYY-MM-DD HH:mm:ss')}( ${config.get('settings.timeZone')} )`,
                                email_for: "confirm-password",
                                email: data.email,
                                user_id: data.user_id
                            }
                            await apiServices.sendEmailNotification(serviceData, res);
                            await Users.findOneAndUpdate({ _id: req.body.data.id }, { withdraw: false, password_reset_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                            await apiServices.publishNotification(user.user_id,{'change_password':true,'logout':true});
                            return res.status(202).send(this.successFormat({
                                'message': 'Your password has been changed successfully.'
                            }, user._id, 'users', 202));
                        }
                        if (checkHash != null) {
                            await mangHash.findOneAndUpdate({ email: checkHash.email, hash: checkHash.hash, is_active: false, type_for: "reset" }, { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                        }
                        let serviceData =
                        {
                            subject: `Beldex Reset Password  ${moment().format('YYYY-MM-DD HH:mm:ss')}( ${config.get('settings.timeZone')} )`,
                            email_for: "reset-password",
                            email: user.email,
                            user_id: user._id
                        }
                        await apiServices.sendEmailNotification(serviceData, res);
                        await apiServices.publishNotification(user.user_id,{'reset_password':true,'logout':false});
                        return res.status(202).send(this.successFormat({
                            'message': 'Your password has been reset successfully.'
                        }, user._id, 'users', 202));
                    }
                });
            });
        });
    }

    changePasswordValidate(req) {
        let schema = Joi.object().keys({
            g2f_code: Joi.string(),
            otp: Joi.string(),
            old_password: Joi.string().required(),
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
        });

        return schema.validate(req, { abortEarly: false })
    }

    async changePassword(req, res) {
        let requestData = req.body.data.attributes;
        requestData.old_password = await helpers.decrypt(requestData.old_password,res);
        if (requestData.old_password === '') {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Your request was not encrypted.'
            }));
        }
        Users.findById(req.body.data.id)
            .exec()
            .then(async (result) => {
                let check = null;
                if (!result) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'User cannot be found.'
                    }));
                }

                if (result.google_auth) {
                    if (!requestData.g2f_code) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Google authentication code must be provided.'
                        }, 'user', 400));
                    }
                    let check = await user.postVerifyG2F(req, res, 'boolean');
                    if (check.status == false) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'The google authentication code you entered is incorrect.'
                        }, '2factor', 400));
                    }

                }
                else {
                    if (requestData.otp == null || undefined) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'OTP must be provided.'
                        }, 'user', 400));
                    }
                    let checkOtp = await user.validateOtpForEmail(req, res, "change password");
                    if (checkOtp.status == false) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': checkOtp.err
                        }, 'user', 400));
                    }
                }
                let passwordCompare = bcrypt.compareSync(requestData.old_password, result.password);

                if (passwordCompare == false) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'The new password must be different from the old password.'
                    }));
                } else {
                    req.body.data.attributes.email = result.email;
                    req.body.data.attributes.user_id = result._id;
                    // update password
                    this.resetPassword(req, res, 'change', result.email);
                }


            });
    }
}

module.exports = new Password;