const Joi = require('joi');
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
        let emailReg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        let schema = Joi.object().keys({
            email: Joi.string().required().regex(emailReg).options({
                language: {
                    string: {
                        required: 'Please enter your {{label}} address.',
                        regex: {
                            base: 'Please enter a valid {{label}} address.'
                        }
                    }
                }
            }).label('email'),
            ip: Joi.string().allow('').optional()
        });

        return Joi.validate(req, schema, { abortEarly: false });
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
                    await apiServices.sendEmailNotification(serviceData,res);
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

            await apiServices.sendEmailNotification(serviceData,res);
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


        let userHash = JSON.parse(helpers.decrypt(req.params.hash));
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
            password: Joi.string().required().regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
                language: {
                    string: {
                        required: 'Please enter a {{label}}.',
                        regex: {
                            base: '{{label}} must be a minimum of 8 characters. Please use a combination of alpha numeric, upper case and lower case characters.'
                        }
                    }
                }
            }).label('password'),
            password_confirmation: Joi.any().valid(Joi.ref('password')).required().label('password confirmation').options({ language: { any: { allowOnly: 'must match password' } } }),
            hash: Joi.string()
        });

        return Joi.validate(req, schema, { abortEarly: false })
    }

    async resetPassword(req, res, type = 'reset') {

        if (type == 'hash') {
            checkHash = req.body.checkHash;
            return;
        }
        const checkPassword = await Users.findById({_id:req.body.data.id});
        let comparePassword = await bcrypt.compare(req.body.data.attributes.password,checkPassword.password);
        if(comparePassword){
           return res.status(400).send(this.successFormat({
               'message': 'Please enter a password that you have not used before.'
           }, checkPassword._id, 'users', 400));
            
        }
         
        bcrypt.genSalt(10, (err, salt) => {
            if (err) return res.status(404).send(this.errorMsgFormat({ 'message': 'Invalid user.' }));

            bcrypt.hash(req.body.data.attributes.password, salt, (err, hash) => {
                if (err) return res.status(404).send(this.errorMsgFormat({ 'message': 'Invalid user.' }));
                
               
                // find and update the reccord
                Users.findByIdAndUpdate(req.body.data.id, { password: hash }, async (err, user) => {
                    if (user == null) {
                        return res.status(404).send(this.errorMsgFormat({ 'message': 'Invalid user.' }));
                    } else {

                        if (type == 'change') {
                            let serviceData =
                            {
                                subject: `Beldex Change Password From ${req.body.data.attributes.email} - ${moment().format('YYYY-MM-DD HH:mm:ss')}( ${config.get('settings.timeZone')} )`,
                                email_for: "confirm-password",
                                email: req.body.data.attributes.email,
                                user_id: req.body.data.attributes.user_id
                            }
                            await apiServices.sendEmailNotification(serviceData,res);
                            await Users.findOneAndUpdate({_id:req.body.data.id},{withdraw:false, password_reset_time:moment().format('YYYY-MM-DD HH:mm:ss')})
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
                        await apiServices.sendEmailNotification(serviceData,res);
                        
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
            password: Joi.string().required().regex(/^(?=.*?[A-Z])(?=.*?[0-9]).{8,}$/).options({
                language: {
                    string: {
                        required: 'Please enter a {{label}}.',
                        regex: {
                            base: ' {{label}} must be a minimum of 8 characters. Please use a combination of alpha numeric, upper case and lower case characters.'
                        }          
                    }
                }
            }).label('password'),
            password_confirmation: Joi.any().valid(Joi.ref('password')).required().label('password confirmation').options({ language: { any: { allowOnly: 'must match password' } } }),
        });

        return Joi.validate(req, schema, { abortEarly: false })
    }

    changePassword(req, res) {
        let requestData = req.body.data.attributes;
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
                        return res.status(400).send(this.errorFormat({
                            'message': 'Google authentication code must be provided.'
                        }, 'user', 400));
                    }
                    let check = await user.postVerifyG2F(req, res, 'boolean');
                    if (check.status == false) {
                        return res.status(400).send(this.errorFormat({
                            'message': 'The google authentication code you entered is incorrect.'
                        }, '2factor', 400));
                    }

                }
                else {
                    if (requestData.otp == null || undefined) {
                        return res.status(400).send(this.errorFormat({
                            'message': 'OTP must be provided.'
                        }, 'user', 400));
                    }
                    let checkOtp = await user.validateOtpForEmail(req, res, "change password");
                    if(checkOtp.status == false){
                        return res.status(400).send(this.errorFormat({
                            'message':checkOtp.err
                        }, 'user', 400));
                    }
                }
                let passwordCompare = bcrypt.compareSync(req.body.data.attributes.old_password, result.password);

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