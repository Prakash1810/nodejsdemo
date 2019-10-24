const moment = require('moment');
const axios = require('axios');
const users = require('../db/users');
const fee = require('../db/matching-engine-config');
const apiServices = require('../services/api');
const deviceMangement = require('../db/device-management');
const deviceWhitelist = require('../db/device-whitelist');
const loginHistory = require('../db/login-history');
const userTemp = require('../db/user-temp');
const helpers = require('../helpers/helper.functions');
const config = require('config');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const bcrypt = require('bcrypt');
const controller = require('../core/controller');
const g2fa = require('2fa');
const token = require('../db/management-token');
const otpType = require("../db/otp-types");
const otpHistory = require('../db/otp-history');
const sequence = require('../db/sequence');
const addMarket = require('../db/market-list');
const favourite = require('../db/favourite-user-market');
const accountActive = require('../db/account-active');
const mangHash = require('../db/management-hash');
const referralHistory = require('../db/referral-history');
const kycDetails = require('../db/kyc-details');
const fs = require('fs');
const _ = require('lodash');
const kyc = require('./kyc');
const settings = require('../db/settings');
const NodeRSA = require('node-rsa');
const uuidv4 = require('uuid/v4');
const { RequestBuilder, Payload } = require('yoti');


class User extends controller {

    async activate(req, res) {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash))
        let checkhash = await mangHash.findOne({ email: userHash.email, hash: req.params.hash })
        {
            if (checkhash) {
                if (checkhash.is_active) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Verification link -already used'
                    }));
                }
                else {
                    await mangHash.findOneAndUpdate({ email: userHash.email, hash: req.params.hash, is_active: false, type_for: "registration" }, { is_active: true, count: 1, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                }
            }
            else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Verification link is expired'
                }));
            }
        }
        let date = new Date(userHash.date);
        let getSeconds = date.getSeconds() + config.get('activation.expiryTime');
        let duration = moment.duration(moment().diff(userHash.date));
        if (getSeconds > duration.asSeconds()) {

            if (userHash.id) {
                userTemp.findById(userHash.id)
                    .exec((err, result) => {
                        if (result) {
                            return this.insertUser(result, res)
                        } else {
                            return res.status(400).send(this.errorMsgFormat({
                                'message': 'Token expired-already used'
                            }));
                        }
                    });
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Token is expired.'
                }));
            }
        }
        else {
            if (userTemp.removeUserTemp(userHash.id)) {
                await accountActive.deleteOne({ email: userHash.email, type_for: 'register' })
                return res.status(400).send(this.errorFormat({
                    'message': 'Token is expired'
                }));

            }
            else {
                return res.status(400).send(this.errorFormat({
                    'message': 'User not found'
                }));
            }
        }

    }
    async getRandomString() {
        var result = '';
        var characters = 'abcdefghijklmnopqrstuvwxyz';
        var charactersLength = characters.length;
        for (var i = 0; i < 2; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    async insertUser(result, res) {

        try {
            let referrerCode = null;
            let inc = await sequence.findOneAndUpdate({ sequence_type: "users" }, {
                $inc: {
                    login_seq: 1
                }
            });
            //create referal code
            let subString = result.email.substring(0, 4);
            let randomNumber = Math.floor(Math.random() * (99 - 10) + 10);

            let str = result.email;
            let sub = str.indexOf("@");
            var getChar = str.substring(sub, 0);
            let twoChar = getChar.substring(sub, getChar.length - 2)
            let code = `${subString}${randomNumber}${await this.getRandomString()}${twoChar}`;
            let user = await users.create({
                email: result.email,
                password: result.password,
                referral_code: code,
                referrer_code: referrerCode,
                created_date: result.created_date,
                user_id: inc.login_seq,
                taker_fee: (await fee.findOne({ config: 'takerFeeRate' })).value,
                maker_fee: (await fee.findOne({ config: 'makerFeeRate' })).value
            });

            if (userTemp.removeUserTemp(result.id)) {

                // address creation;
                await accountActive.deleteOne({ email: result.email, type_for: 'register' })
                await apiServices.initAddressCreation(user);
                //welcome mail
                let serviceData = {
                    subject: "Welcome to Beldex",
                    email_for: "welcome",
                    to_email: user.email,
                    link: `${process.env.LINKURL}${code}`
                }
                await apiServices.sendEmailNotification(serviceData, res);
                await this.updateBalance(inc.login_seq, user._id, res, 'registration_reaward');
                //deposit mail,
                return res.status(200).send(this.successFormat({
                    'message': `Congratulation!, Your account has been activated.`
                }));
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid token. may be token as expired!'
                }));
            }
        }
        catch (err) {
            return res.status(500).send(this.errorMsgFormat(err))
        }
    }
    async createToken(user, id) {

        let jwtOptions = {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: config.get('secrete.expiry'),
        };

        return await jwt.sign({
            user: user._id,
            login_id: id,
            user_id: user.user_id,
        }, config.get('secrete.key'), jwtOptions);
    };

    async createRefreshToken(user, id) {
        let options = {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: config.get('secrete.refreshTokenExpiry'),

        };
        return await jwt.sign({
            user: user._id,
            login_id: id,
            user_id: user.user_id,
        }, config.get('secrete.refreshKey'), options);

    }

    async storeToken(user, loginHistory) {
        let accessToken = await this.createToken(user, loginHistory);
        let refreshToken = await this.createRefreshToken(user, loginHistory);
        let data = {
            user: user._id,
            access_token: accessToken,
            refresh_token: refreshToken,
            created_date: Date.now()
        }
        await new token(data).save();
        return { accessToken: accessToken, refreshToken: refreshToken }
    }

    async login(req, res) {
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
        let data = req.body.data.attributes;
        let isChecked = await accountActive.findOne({ email: data.email, type_for: 'login' });
        users.findOne({
            email: data.email,

        })
            .exec()
            .then(async (result) => {
                if (!result) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'User not found, Please register your email'
                    }));
                }
                else if (!result.is_active) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'This account has disable, Please contact our beldex support team',
                    }, 'users', 400));
                }
                else if (result.is_active) {
                    let passwordCompare = bcrypt.compareSync(data.password, result.password);
                    if (passwordCompare == false) {

                        if (isChecked) {
                            if (isChecked.count <= config.get('accountActive.hmt')) {
                                await accountActive.findOneAndUpdate({ email: data.email, type_for: 'login' },
                                    {
                                        $inc: {
                                            count: 1
                                        },
                                        create_date: timeNow
                                    })
                            }
                            else {
                                return res.status(400).send(this.errorMsgFormat({
                                    'message': 'Account has been locked, please try again after 2 hours!'
                                }));
                            }
                            if (isChecked.count > config.get('accountActive.limit')) {
                                return res.status(400).send(this.errorMsgFormat({
                                    'message': `Invalid credentials, Your are about to exceed the maximum try - only ${config.get('accountActive.hmt') - isChecked.count + 1}  attempt${(config.get('accountActive.hmt') - isChecked.count) + 1 > 1 ? 's' : ''} left`
                                }));
                            }
                        }
                        else {
                            await new accountActive({ email: data.email, create_date: timeNow, type_for: 'login' }).save();
                        }

                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Invalid credentials'
                        }));
                    } else {
                        if (isChecked) {
                            if (isChecked.count > config.get('accountActive.hmt')) {
                                let date = new Date(isChecked.create_date);
                                let getSeconds = date.getSeconds() + config.get('accountActive.timeExpiry');
                                let duration = moment.duration(moment().diff(isChecked.create_date));
                                if (getSeconds > duration.asSeconds()) {

                                    return res.status(400).send(this.errorMsgFormat({
                                        'message': 'Account has been locked, please try again after 2 hours!'
                                    }));
                                }
                                else {
                                    await accountActive.deleteOne({ email: data.email, type_for: 'login' })
                                    // check that device is already exists or not
                                    this.checkDevice(req, res, result);
                                }

                            }
                            else {
                                await accountActive.deleteOne({ email: data.email, type_for: 'login' })
                                // check that device is already exists or not
                                this.checkDevice(req, res, result);
                            }
                        }

                        else {
                            // check that device is already exists or not
                            this.checkDevice(req, res, result);
                        }

                    }
                } else {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Your account has been disabled.'
                    }));
                }
            });
    }

    validate(req) {
        let emailReg = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
        let schema = Joi.object().keys({
            email: Joi.string().required().regex(emailReg).options({
                language: {
                    string: {
                        required: '{{label}} field is required',
                        regex: {
                            base: 'Invalid {{label}} address'
                        }
                    }
                }
            }).label("email"),
            password: Joi.string().required().options({
                language: {
                    string: {
                        required: '{{label}} field is required',
                    }
                }
            }).label('password'),
            is_browser: Joi.boolean().required(),
            is_mobile: Joi.boolean().required(),
            ip: Joi.string().required(),
            country: Joi.string().required(),
            os: Joi.string().allow('').optional(),
            os_byte: Joi.string().allow('').optional(),
            browser: Joi.string().allow('').optional(),
            browser_version: Joi.string().allow('').optional(),
            city: Joi.string().allow('').optional(),
            region: Joi.string().allow('').optional(),
        });

        return Joi.validate(req, schema, {
            abortEarly: false
        });
    }

    deviceValidate(data) {
        let schema = Joi.object().keys({
            is_browser: Joi.boolean().required(),
            is_mobile: Joi.boolean().required(),
            ip: Joi.string().required(),
            country: Joi.string().required(),
            os: Joi.string().allow('').optional(),
            os_byte: Joi.string().allow('').optional(),
            browser: Joi.string().allow('').optional(),
            browser_version: Joi.string().allow('').optional(),
            city: Joi.string().allow('').optional(),
            region: Joi.string().allow('').optional(),
        })
        return Joi.validate(data, schema, {
            abortEarly: false
        });
    }
    removeUser(email, res) {
        users.deleteOne({
            email: email
        })
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

    getTokenToUserId(req, res, data = 'json') {
        let token = req.headers.authorization;
        try {
            let decoded = jwt.verify(token, config.get('secrete.key'));
            if (data === 'json') {
                return res.status(200).json({
                    "code": 0,
                    "message": null,
                    "data": {
                        "user_id": decoded.user_id
                    }
                });
            } else {
                return decoded.user;
            }
        } catch (err) {
            return res.status(401).send(this.errorMsgFormat({
                message: "Invalid Authentication"
            }, 'user', 401));
        }
    }
    async generatorOtpforEmail(user, typeFor = 'login', res) {
        try {
            const rand = Math.random() * (999999 - 100000) + 100000;
            const getOtpType = await otpType.findOne({ otp_prefix: "BEL" });
            const otp = `${getOtpType.otp_prefix}-${Math.floor(rand)}`;
            const isChecked = await otpHistory.findOneAndUpdate({ user_id: user, is_active: false, type_for: typeFor }, { count: 0, otp: otp, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') })
            if (!isChecked) {
                let data =
                {
                    otp_type: getOtpType._id,
                    user_id: user,
                    otp: otp,
                    create_date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                    type_for: typeFor
                }

                await new otpHistory(data).save();
            }
            let serviceData =
            {
                subject: `Beldex ${typeFor == 'login' ? 'login' : typeFor} verification code  ${moment().format('YYYY-MM-DD HH:mm:ss')} ( ${config.get('settings.timeZone')} )`,
                email_for: "otp-login",
                otp: Math.floor(rand),
                user_id: user
            }
            await apiServices.sendEmailNotification(serviceData, res);
            if (typeFor == "login") {
                return { status: true }
            }

            return res.status(200).send(this.successFormat({
                'message': "The OTP has been sent your registered email ID. Please check"
            }, user))

        }
        catch (err) {
            if (typeFor != 'login') {
                return res.status(500).send(this.errorMsgFormat({
                    'message': err.message
                }, 'users', 500));
            }
            return { status: false, error: err.message }

        }

    }

    async returnToken(req, res, result, type) {
        let attributes = req.body.data.attributes;
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
        let isCheckedDevice = await deviceMangement.find({ user: result._id, region: attributes.region, city: attributes.city, ip: attributes.ip });
        if (isCheckedDevice.length == 0) {
            this.sendNotification({
                'ip': attributes.ip,
                'time': timeNow,
                'browser': attributes.browser,
                'browser_version': attributes.browser_version,
                'os': attributes.os,
                'user_id': result._id
            }, res);
        }
        const device = await this.insertDevice(req, res, result._id, true, 'withValidation');

        let data = {
            user: result._id,
            device: device._id,
            auth_type: type,
            login_date_time: timeNow
        }
        let loginHistory = await this.insertLoginHistory(data);
        let tokens = await this.storeToken(result, loginHistory._id);
        await deviceWhitelist.findOneAndUpdate({ user: result._id }, { last_login_ip: attributes.ip, modified_date: moment().format('YYYY-MM-DD HH:mm:ss') })
        return res.status(200).send(this.successFormat({
            "token": tokens.accessToken,
            "refreshToken": tokens.refreshToken,
            "google_auth": result.google_auth,
            "sms_auth": result.sms_auth,
            "anti_spoofing": result.anti_spoofing,
            "anti_spoofing_code": result.anti_spoofing_code,
            'white_list_address': result.white_list_address,
            "loggedIn": timeNow,
            "withdraw": result.withdraw,
            "expiresIn": config.get('secrete.expiry'),
            "taker_fee": result.taker_fee,
            "maker_fee": result.maker_fee,
            "kyc_verified": result.kyc_verified,
            "trade": result.trade,
            "referral_code": result.referral_code

        }, result._id));
    }

    async addWhitelist(data, userID, verify = false) {
        return await new deviceWhitelist({
            user: userID,
            browser: data.browser,
            region: data.region,
            city: data.city,
            os: data.os,
            verified: verify,
        }).save();

    }

    async checkDevice(req, res, user) {
        let userID = user._id;
        let data = req.body.data.attributes;
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
        let count = await deviceWhitelist.countDocuments({ user: userID });
        console.log("Count:", count)
        if (count == 0) {
            let isAuth = await users.findOne({
                _id: userID, $or: [
                    {
                        "sms_auth": true
                    },
                    {
                        "google_auth": true
                    }
                ]
            })
            if (isAuth) {
                await this.addWhitelist(data, userID, true);
                res.status(200).send(this.successFormat({
                    'message': "You are successfully logged in.",
                    "google_auth": isAuth.google_auth,
                    "sms_auth": isAuth.sms_auth,

                }, userID))

            }
            else {
                const isChecked = await this.generatorOtpforEmail(userID, "login", res);
                if (isChecked.status) {
                    await this.addWhitelist(data, userID, true);
                    res.status(200).send(this.successFormat({
                        'message': "Send a OTP on your email",
                        "region": data.region,
                        "city": data.city,
                        "ip": data.ip
                    }, userID))
                }
                else {
                    return res.status(500).send(this.errorMsgFormat({
                        'message': isChecked.error
                    }, 'users', 500));
                }
            }
        } else {
            let result = await deviceWhitelist.findOne({
                user: userID,
                browser: data.browser,
                region: data.region,
                city: data.city,
                os: data.os,
                verified: true,
            });
            if (!result) {
                // insert new device records
                await this.insertDevice(req, res, userID);
                let urlHash = this.encryptHash({
                    "user_id": userID,
                    "email": data.email,
                    "ip": data.ip,
                    "browser": data.browser,
                    "verified": true
                });

                // send email notification
                this.sendNotificationForAuthorize({
                    "subject": `Authorize New Device/Location ${data.ip} - ${timeNow} ( ${config.get('settings.timeZone')} )`,
                    "email_for": "user-authorize",
                    "device": `${data.browser} ${data.browser_version} ( ${data.os} )`,
                    "location": `${data.city} ${data.country}`,
                    "ip": data.ip,
                    "hash": urlHash,
                    "user_id": userID
                }, res)
                let check = await mangHash.findOne({ email: data.email, type_for: 'new_authorize_device', is_active: false });
                if (check) {
                    await mangHash.findOneAndUpdate({ email: data.email, type_for: 'new_authorize_device', is_active: false }, { hash: urlHash, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                }
                else {
                    await new mangHash({
                        email: data.email,
                        type_for: 'new_authorize_device',
                        hash: urlHash,
                        created_date: moment().format('YYYY-MM-DD HH:mm:ss')
                    }).save()
                }
                let checkWhiteList = await deviceWhitelist.findOne({
                    user: userID,
                    browser: data.browser,
                    region: data.region,
                    city: data.city,
                    os: data.os,
                    verified: false,
                })
                if (!checkWhiteList) {
                    await this.addWhitelist(data, userID, false);
                }

                return res.status(401).send(this.errorMsgFormat({
                    'message': 'unauthorized',
                    'hash': urlHash
                }, 'users', 401));
            }
            else {
                let isAuth = await users.findOne({
                    _id: userID, $or: [
                        {
                            "sms_auth": true
                        },
                        {
                            "google_auth": true
                        }
                    ]
                })
                if (isAuth) {
                    res.status(200).send(this.successFormat({
                        'message': "You are successfully logged in.",
                        "google_auth": isAuth.google_auth,
                        "sms_auth": isAuth.sms_auth,

                    }, userID))

                }
                else {
                    const isChecked = await this.generatorOtpforEmail(userID, "login", res);
                    if (isChecked.status) {
                        res.status(200).send(this.successFormat({
                            'message': "The OTP has been sent your registered email ID. Please check",
                            "region": data.region,
                            "city": data.city,
                            "ip": data.ip
                        }, userID))
                    }
                    else {
                        return res.status(500).send(this.errorMsgFormat({
                            'message': isChecked.error
                        }, 'users', 500));
                    }
                }
            }

        }


    }

    async validateOtpForEmail(req, res, typeFor = "login") {
        try {
            let data = req.body.data.attributes;
            let id = req.body.data.id
            const isChecked = await otpHistory.findOne({ user_id: id, otp: data.otp, is_active: false, type_for: typeFor });
            if (isChecked) {
                let date = new Date(isChecked.create_date_time);
                let getSeconds = date.getSeconds() + config.get('otpForEmail.timeExpiry');
                let duration = moment.duration(moment().diff(isChecked.create_date_time));
                if (getSeconds > duration.asSeconds()) {
                    if (typeFor == "login") {
                        let checkUser = await users.findOne({ _id: id });
                        await otpHistory.findOneAndUpdate({ _id: isChecked._id, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                        delete data.otp;
                        await this.returnToken(req, res, checkUser, 1);
                    }
                    else {
                        await otpHistory.findOneAndUpdate({ _id: isChecked._id, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                        return { status: true }
                    }

                }
                else {
                    await otpHistory.findOneAndUpdate({ user_id: id, is_active: false, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss'), time_expiry: 'Yes' })
                    if (typeFor !== 'login') {
                        return { status: false, err: 'OTP is expired.' }
                    }
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'OTP is expired.'
                    }));

                }


            }
            else {
                if (typeFor !== 'login') {
                    return { status: false, err: 'Invalid OTP' }
                }
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid OTP'
                }));
            }
        }
        catch (err) {
            if (typeFor !== 'login') {
                return { status: false, err: err.message }
            }
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }


    }

    async resendOtpValidation(req) {
        let schema = Joi.object().keys({
            user_id: Joi.string().required(),
            type: Joi.string().required(),
        });

        return Joi.validate(req, schema, {
            abortEarly: false,
        });
    }
    async resendOtpForEmail(req, res, typeFor) {
        let data = req.body.data.attributes;
        const isChecked = await otpHistory.findOne({ user_id: data.user_id, is_active: false, type_for: typeFor });
        if (isChecked) {
            if (isChecked.count <= config.get('otpForEmail.hmt')) {
                let count = isChecked.count++;
                let inCount = ++count;
                const rand = Math.random() * (999999 - 100000) + 100000
                const getOtpType = await otpType.findOne({ otp_prefix: "BEL" });
                let serviceData =
                {
                    subject: `Beldex ${typeFor == "login" ? "login" : typeFor} verification code  ${moment().format('YYYY-MM-DD HH:mm:ss')} ( ${config.get('settings.timeZone')} )`,
                    email_for: "otp-login",
                    otp: Math.floor(rand),
                    user_id: data.user_id
                }
                await apiServices.sendEmailNotification(serviceData, res);
                await otpHistory.findOneAndUpdate({ user_id: data.user_id, is_active: false, type_for: typeFor }, { count: inCount, otp: `${getOtpType.otp_prefix}-${Math.floor(rand)}`, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });

                return res.status(200).send(this.successFormat({
                    'message': "Send a OTP on your email"
                }, data.user_id))
            }
            else {
                await otpHistory.findOneAndUpdate({ user_id: data.user_id, is_active: false, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                return res.status(400).send(this.errorMsgFormat({
                    'message': ` OTP resent request exceeded, please login again `
                }, 'users', 400));
            }
        }
        else {
            let isChecked = await this.generatorOtpforEmail(data.user_id, typeFor, res)
            if (isChecked.status) {
                res.status(200).send(this.successFormat({
                    'message': "Send a OTP on your email"
                }, data.user_id))
            }
            else {
                return res.status(500).send(this.errorMsgFormat({
                    'message': isChecked.error
                }, 'users', 500));
            }
        }
    }


    // send email notification to the authorize device
    sendNotificationForAuthorize(data, res) {
        return apiServices.sendEmailNotification(data, res);
    }

    // send email notification to the registered user
    sendNotification(data, res) {
        let serviceData = {
            "subject": `Successful Login From IP ${data.ip} - ${data.time} ( ${config.get('settings.timeZone')} )`,
            "email_for": "user-login",
            "device": `${data.browser} ${data.browser_version} ( ${data.os} )`,
            "time": data.time,
            "ip": data.ip,
            "user_id": data.user_id
        };

        return apiServices.sendEmailNotification(serviceData, res);
    }

    async insertDevice(req, res, userID, verify = false, type = 'withoutValidation') {
        if (type != 'withoutValidation') {
            let { error } = await this.deviceValidate(req.body.data.attributes);
            if (error) {
                return res.status(400).send(this.errorFormat(error, 'users', 400));
            }
        }
        let attributes = req.body.data.attributes;
        let data = {
            user: userID,
            is_browser: attributes.is_browser,
            is_mobile: attributes.is_mobile,
            os: attributes.os,
            os_byte: attributes.os_byte,
            browser: attributes.browser,
            browser_version: attributes.browser_version,
            ip: attributes.ip,
            city: attributes.city,
            region: attributes.region,
            country: attributes.country,
            verified: verify
        };

        return new deviceMangement(data).save();
    }

    async insertLoginHistory(data) {

        let attributes = {
            user: data.user,
            device: data.device,
            auth_type: data.auth_type,
            login_date_time: data.login_date_time
        }
        return new loginHistory(attributes).save();
    }

    getLoginHistory(req, res) {
        let pageNo = parseInt(req.query.page_no)
        let size = parseInt(req.query.size)
        let query = {}
        if (pageNo < 0 || pageNo === 0) {
            return res.status(400).json(this.errorMsgFormat({
                "message": "invalid page number, should start with 1"
            }))
        }

        query.skip = size * (pageNo - 1)
        query.limit = size

        let userID = req.user.user

        // Find some documents
        loginHistory.countDocuments({
            user: userID
        }, (err, totalCount) => {
            if (err) {
                return res.status(200).json(this.successFormat({
                    "data": [],
                    "pages": 0,
                    "totalCount": 0
                }, userID, 'loginHistory', 200));
            } else {
                loginHistory
                    .find({
                        user: userID
                    })
                    .select('-__v -_id')
                    .skip(query.skip)
                    .limit(query.limit)
                    .populate({
                        path: 'device',
                        select: '_id user created_date ip country city'
                    })
                    .sort({ _id: 'desc' })
                    .exec()
                    .then((data) => {
                        if (!data.length) {
                            return res.status(200).json(this.successFormat({
                                "data": [],
                                "pages": 0,
                                "totalCount": 0
                            }, userID, 'loginHistory', 200));
                        } else {
                            let totalPages = Math.ceil(totalCount / size);
                            return res.status(200).json(this.successFormat({
                                "data": data,
                                "pages": totalPages,
                                "totalCount": totalCount
                            }, userID, 'loginHistory', 200));
                        }
                    });
            }
        });
    }

    getDeviceHistory(req, res) {
        let pageNo = parseInt(req.query.page_no)
        let size = parseInt(req.query.size)
        let query = {}
        if (pageNo < 0 || pageNo === 0) {
            return res.status(400).json(this.errorMsgFormat({
                "message": "invalid page number, should start with 1"
            }))
        }

        query.skip = size * (pageNo - 1)
        query.limit = size

        let userID = req.user.user;

        // Find some documents
        deviceMangement.countDocuments({
            user: userID
        }, (err, totalCount) => {
            if (err) {
                return res.status(200).json(this.successFormat({
                    "data": [],
                    "pages": 0,
                    "totalCount": 0
                }, userID, 'device', 200));
            } else {
                deviceMangement.find({
                    user: userID,
                    is_deleted: false
                }, '-_id -__v -user', query, (err, data) => {
                    if (err || !data.length) {
                        return res.status(200).json(this.successFormat({
                            "data": [],
                            "pages": 0,
                            "totalCount": 0
                        }, userID, 'device', 200));
                    } else {
                        let totalPages = Math.ceil(totalCount / size);
                        return res.status(200).json(this.successFormat({
                            "data": data,
                            "pages": totalPages,
                            "totalCount": totalCount
                        }, userID, 'devices', 200));
                    }
                }).sort({ _id: 'desc' })
            }
        });
    }

    encryptHash(jsonData) {
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
        let data = JSON.stringify({
            'data': jsonData,
            'datetime': timeNow
        });

        return helpers.encrypt(data);
    }

    checkTimeExpired(startDate) {
        let duration = moment.duration(moment().diff(startDate));

        // check expiry time in seconds
        if (config.get('settings.expiryTime') > duration.asSeconds()) {
            return true;
        }

        return false;
    }

    async patchWhiteListIP(req, res) {
        try {
            let deviceHash = JSON.parse(helpers.decrypt(req.params.hash));

            if (deviceHash.data.user_id) {
                let check = await mangHash.findOne({ email: deviceHash.data.email, type_for: "new_authorize_device", hash: req.params.hash });
                if (!check) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': "The link has been expired, please click the latest authorize link from your email or try to resend again."
                    }));
                }
                if (check.is_active) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': "The link has already authroized. Please try to login."
                    }));
                }
                let date = new Date(check.created_date);
                let getSeconds = date.getSeconds() + config.get('activation.expiryTime');
                let duration = moment.duration(moment().diff(check.created_date));
                if (getSeconds > duration.asSeconds()) {
                    deviceMangement.findOne({
                        browser: deviceHash.data.browser,
                        user: deviceHash.data.user_id
                    })
                        .exec()
                        .then((result) => {
                            if (!result) {
                                return res.status(400).send(this.errorMsgFormat({
                                    'message': 'Invalid token. may be token as expired!'
                                }));
                            } else {
                                this.updateWhiteListIP(deviceHash, req, res);
                            }
                        });
                }
                else {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'The link has been expired, please try to resend again.'
                    }));
                }
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'Invalid token '
                }));
            }
        }
        catch (err) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }

    }

    updateWhiteListIP(hash, req, res) {

        // find and update the reccord
        deviceMangement.updateMany({
            'browser': hash.data.browser,
            'user': hash.data.user_id,
        }, {
            verified: hash.data.verified
        }, async (err, device) => {
            if (err) {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'Invalid device.'
                }));
            } else {
                await mangHash.findOneAndUpdate({ email: hash.data.email, hash: req.params.hash, type_for: 'new_authorize_device', }, { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') });
                await deviceWhitelist.findOneAndUpdate({ user: hash.data.user_id, verified: false }, { verified: true, modified_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                return res.status(202).send(this.successFormat({
                    'message': 'Your IP address whitelisted Now you can able to login..'
                }, device.user, 'users', 202));
            }
        });
    }

    settingsValidate(req) {
        let schema = Joi.object().keys({
            sms_auth: Joi.boolean().optional(),
            password: Joi.string().optional(),
            google_auth: Joi.boolean().optional(),
            google_secrete_key: Joi.string().optional(),
            mobile: Joi.number().optional(),
            mobile_code: Joi.number().optional(),
            anti_spoofing: Joi.boolean().optional(),
            anti_spoofing_code: Joi.string().optional(),
            white_list_address: Joi.boolean().optional(),
            g2f_code: Joi.string(),
            white_list_address: Joi.boolean().optional(),
            otp: Joi.string().optional(),
            type: Joi.string().optional()
        });

        return Joi.validate(req, schema, {
            abortEarly: false
        });
    }

    async patchSettings(req, res, type = 'withoutCallPatchSetting') {
        try {
            let requestData = req.body.data.attributes;
            if (type != 'disable') {
                req.body.data.id = req.user.user;
            }
            if (requestData.code !== undefined) {
                let userHash = JSON.parse(helpers.decrypt(requestData.code));
                requestData.is_active = userHash.is_active;
            }
            if (type != 'withCallPatchSetting' && type != 'disable') {

                let check = await users.findOne({ _id: req.body.data.id, google_auth: true });
                if (check) {
                    let isChecked = await this.postVerifyG2F(req, res, 'setting');
                    if (isChecked.status == false) {
                        return res.status(400).send(this.errorFormat({
                            'message': 'Incorrect code'
                        }, 'user', 400));
                    }
                }
                else {
                    if (requestData.hasOwnProperty('anti_spoofing') || requestData.hasOwnProperty('white_list_address') || requestData.hasOwnProperty('anti_spoofing_code')) {
                        if (!requestData.type) {
                            return res.status(400).send(this.errorFormat({
                                'message': 'Incorrect data'
                            }, 'user', 400));
                        }
                        if (requestData.otp == null || undefined) {
                            return res.status(400).send(this.errorFormat({
                                'message': 'Otp must be provide'
                            }, 'user', 400));
                        }
                        req.body.data['id'] = req.user.user;
                        let checkOtp = await this.validateOtpForEmail(req, res, requestData.type);
                        if (checkOtp.status == false) {
                            return res.status(400).send(this.errorFormat({
                                'message': checkOtp.err
                            }, 'user', 400));
                        }

                    }
                }
            }
            if (req.body.data.id !== undefined && Object.keys(requestData).length) {

                // find and update the reccord
                let update = await users.findOneAndUpdate({
                    _id: req.body.data.id
                }, {
                    $set: requestData
                });
                if (update) {
                    if (type == 'withCallPatchSetting' || type == 'disable') {
                        return { status: true }
                    }
                    return res.status(202).send(this.successFormat({
                        'message': 'Your request is updated successfully.'
                    }, null, 'users', 202));
                }
                else {
                    if (type == 'withCallPatchSetting' || type == 'disable') {
                        return { status: false }
                    }
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid request.'
                    }, 'users', 400));
                }
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid request.'
                }, 'users', 400));
            }
        } catch (error) {
            return res.status(400).send(this.errorMsgFormat({
                'message': error.message
            }, 'patchSetting', 400));
        }

    }

    async disableAccount(req, res) {
        let requestedData = req.body.data.attributes;
        let userHash = JSON.parse(helpers.decrypt(requestedData.code));
        if (userHash.is_active !== undefined) {
            let checkActive = await users.findOne({ _id: req.body.data.id });
            if (!checkActive) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'User not found',
                }, 'users', 400));

            }
            if (checkActive.is_active == false) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'This account has already disable, Please contact our beldex support team',
                }, 'users', 400));
            }
            else {
                let checked = await this.patchSettings(req, res, 'disable');
                if (checked.status) {
                    return res.status(202).send(this.successFormat({
                        'message': 'Your request is updated successfully.'
                    }, null, 'users', 202));
                }
                else {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid request..'
                    }, 'users', 400));
                }
            }

        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request..'
            }, 'users', 400));
        }
    }

    async patch2FAuth(req, res) {
        let requestedData = req.body.data.attributes;
        if ((requestedData.password !== undefined && requestedData.g2f_code !== undefined) && req.body.data.id != undefined) {
            let result = await users.findById(req.body.data.id).exec();
            if (!result) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid user'
                }));
            } else if (requestedData.password !== undefined) {
                let passwordCompare = bcrypt.compareSync(requestedData.password, result.password);
                if (passwordCompare == false) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Incorrect password'
                    }));
                }
            }

            let checked = await this.updateG2F(req, res);
            if (checked.status) {
                return res.status(202).send(this.successFormat({
                    'message': 'Your request is updated successfully.'
                }, null, 'users', 202));
            }
            else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid request..'
                }, 'users', 400));
            }
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request'
            }));
        }
    }

    async updateG2F(req, res) {
        let check = await this.postVerifyG2F(req, res, 'boolean');
        if (check.status === true) {
            // delete password attribute

            delete req.body.data.attributes.password;

            return await this.patchSettings(req, res, 'withCallPatchSetting');

        } else {

            return res.status(400).send(this.errorMsgFormat({
                'message': 'Incorrect code'
            }));
        }
    }

    async verifyG2F(req, res, type, google_secrete_key, method = "withoutVerify") {

        try {
            let data = req.body.data.attributes;
            let opts = {
                beforeDrift: 2,
                afterDrift: 2,
                drift: 4,
                step: 30
            };
            let counter = Math.floor(Date.now() / 1000 / opts.step);
            let returnStatus = await g2fa.verifyHOTP(google_secrete_key, data.g2f_code, counter, opts);
            if (returnStatus === true) {
                if (method == 'withoutAuth' && type != 'boolean') {
                    let user = await users.findOne({ _id: req.body.data.id });
                    delete data.g2f_code;
                    delete data.google_secrete_key;
                    await this.returnToken(req, res, user, 2)
                }
                else if (method == 'setting' || type == 'boolean') {
                    return { status: true };
                }
                else {
                    return res.status(202).send(this.successFormat({
                        'status': returnStatus
                    }, null, '2factor', 202));
                }

            } else {
                if (method == 'setting' || type == 'boolean') {
                    return { status: false };
                }
                else {

                    return res.status(400).send(this.errorFormat({
                        'status': returnStatus,
                        'message': 'Incorrect code'
                    }, '2factor', 400));
                }

            }
        }
        catch (err) {
            return res.status(400).send(this.errorMsgFormat({
                'message': err.message
            }, '2factor', 400));
        }

    }

    async postVerifyG2F(req, res, type = 'json') {
        try {
            var method = "withoutAuth";
            if (req.headers.authorization && type != 'boolean') {
                let isChecked = await apiServices.authentication(req);
                if (!isChecked.status) {
                    return res.status(401).json(this.errorMsgFormat({
                        message: "Invalid authentication"
                    }), 'user', 401);

                }
                req.body.data.id = isChecked.result.user;
                method = "withAuth"
            }

            let requestedData = req.body.data.attributes;
            if (requestedData.g2f_code !== undefined) {
                if (requestedData.google_secrete_key === undefined) {
                    let result = await users.findById(req.body.data.id).exec();
                    if (!result) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Invalid data'
                        }));
                    }
                    if (type == 'setting') {
                        method = 'setting';
                        let cheked = await this.verifyG2F(req, res, type, result.google_secrete_key, method);
                        return cheked;
                    }
                    return this.verifyG2F(req, res, type, result.google_secrete_key, method);
                } else {
                    if (type == 'setting') {
                        method = 'setting';
                        let cheked = await this.verifyG2F(req, res, type, result.google_secrete_key, method);
                        return cheked;
                    }

                    return this.verifyG2F(req, res, type, requestedData.google_secrete_key, method);
                }
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid request'
                }, '2factor', 400));
            }
        } catch (err) {
            return res.status(400).send(this.errorMsgFormat({
                'message': err.message
            }, '2factor', 400));
        }

    }

    async refreshToken(data, res) {
        try {

            const user = await users.findOne({
                _id: data.user
            })

            if (user) {
                await token.findOneAndUpdate({ user: user._id, is_deleted: false }, { is_deleted: true, modified_date: Date.now() });
                let tokens = await this.storeToken(user, data.login_id);
                let result = {
                    "token": tokens.accessToken,
                    "refreshToken": tokens.refreshToken,
                    "google_auth": user.google_auth,
                    "sms_auth": user.sms_auth,
                    "anti_spoofing": user.anti_spoofing,
                    "expiresIn": config.get('secrete.expiry')
                };
                return res.status(200).send(this.successFormat(result, tokens.id))
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'User not found'
                }, 'users', 404))
            }
        } catch (err) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }
    }

    async logout(user, accessToken, res) {
        try {
            const logout = await loginHistory.findOneAndUpdate({
                user: user.user,
                logout_status: 1,
                _id: user.login_id
            }, {
                logout_status: 0,
                logout_date_time: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            if (logout) {
                await token.findOneAndUpdate({
                    user: user.user, access_token: accessToken, is_deleted: false
                }, { is_deleted: true })
                return res.status(200).send(this.successFormat({
                    'message': 'Logout Success',
                }))
            }
            else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'User not found'
                }, 'users', 404))
            }

        } catch (err) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }
    }

    async deleteWhitList(data, res) {
        try {
            const deleteWhitList = await deviceMangement.updateMany({
                browser: data.browser,
                browser_version: data.browser_version,
                os: data.os,
                user: data.user,
                is_deleted: false
            }, {
                is_deleted: true
            });

            if (deleteWhitList.nModified != 0) {
                return res.status(200).send(this.successFormat({
                    'message': 'Delete WhiteList Success',
                }));
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'User not found'
                }, 'users', 404));
            }

        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }
    }

    async addMarkets(req, res) {
        let market = await apiServices.matchingEngineRequestForMarketList('market/list', req, res, 'withAdd');

        if (market.status) {
            let data = market.result;
            for (var i = 0; i < data.length; i++) {
                let isCheckMarket = await addMarket.findOne({ market_name: data[i].name });
                if (!isCheckMarket) {
                    let request = {
                        market_name: data[i].name,
                        market_pair: data[i].money
                    }
                    await new addMarket(request).save();
                }
            }


            return res.status(200).send(this.successFormat({
                'message': 'Add Market',
            }));
        }
        else {
            return res.status(400).send(this.errorMsgFormat({
                'message': "Data not found "
            }, 'users', 400));
        }
    }

    async marketList(req, res) {
        let isChecked = await addMarket.find({});
        if (isChecked.length == 0) {
            return res.status(404).send(this.errorMsgFormat({
                'message': "No Data Found"
            }, 'users', 404));
        }
        else {
            await res.status(200).send(this.successFormat(
                isChecked))
        }
    }

    favouriteValidation(data) {
        let schema = Joi.object().keys({
            market: Joi.string().required()
        });
        return Joi.validate(data, schema, {
            abortEarly: false
        });
    }
    async addFavouriteUser(req, res) {
        let data = req.body.data.attributes;
        let isChecked = await addMarket.findOne({ market_name: data.market.toUpperCase() });
        if (!isChecked) {
            return res.status(404).send(this.errorMsgFormat({
                'message': "market not Found"
            }, 'users', 404));
        }

        let isCheckUser = await favourite.findOne({ user: req.user.user });
        if (isCheckUser) {
            let id = isCheckUser.market;
            id.push(isChecked._id);
            await favourite.findOneAndUpdate({ _id: isCheckUser._id }, { market: id })
            return res.status(200).send(this.successFormat({
                'message': 'Add market to your favourite list',
            }));
        }
        await new favourite(
            {
                user: req.user.user,
                market: isChecked._id
            }).save();
        return res.status(200).send(this.successFormat({
            'message': 'Add market to your favourite list',
        }));

    }
    async updateFavourite(req, res) {
        let data = req.body.data.attributes.market;
        let ismarket = await addMarket.findOne({ market_name: data.toUpperCase() });
        if (!ismarket) {
            return res.status(404).send(this.errorMsgFormat({
                'message': "Not found to market list "
            }, 'users', 404));
        }
        let isfavourite = await favourite.findOne({ user: req.user.user });
        if (!isfavourite) {
            return res.status(404).send(this.errorMsgFormat({
                'message': "Not found to your favourite list"
            }, 'users', 404));
        }
        let fav = isfavourite.market;
        let index = fav.indexOf(ismarket._id);
        if (index > -1) {
            fav.splice(index, 1);
        }
        await favourite.findOneAndUpdate({ user: req.user.user }, { market: fav });
        return res.status(200).send(this.successFormat({
            'message': 'Remove market to your favourite list',
        }));

    }

    async withdrawActive(user, res) {
        let checkUser = await users.findOne({ _id: user })
        if (!checkUser) {
            return res.status(400).send(this.errorFormat({
                'message': 'User not found'
            }));
        }
        if (!checkUser.withdraw) {
            let date = new Date(checkUser.password_reset_time);
            let getSeconds = date.getSeconds() + config.get('withdrawActive.timeExpiry');
            let duration = moment.duration(moment().diff(checkUser.password_reset_time));
            if (getSeconds > duration.asSeconds()) {
                return res.status(400).send(this.errorFormat({
                    'message': `Your withdrawal has been disabled for 24 hours from the time your change password`
                }));
            }
            else {
                checkUser.withdraw = true;
                checkUser.save();
                return res.status(200).send(this.successFormat({
                    'message': 'You can be proceed withdraw'
                }, null, 'user', 200));
            }
        }
    }
    async kycSession(req, res, type = 'session') {

        let token = req.headers.authorization;
        let userId = req.user.user;
        let result = await kyc.init(userId, token)
        if (result) {
            if (type == 'details') {
                return { status: true, result: result };
            }
            return res.status(200).send(this.successFormat(
                result
            ), null, 'user', 200);
        }
        else {
            if (type == 'details') {
                return { status: false, error: `Something wrong` };
            }
            return res.status(400).send(this.errorFormat({
                'message': `Something wrong`
            }));
        }
    }

    async kycUpdate(req, res) {

        let data = req.body;
        console.log("Data:", data);
        if (data.topic == 'resource_update') {
            let checkSessionId = await kycDetails.findOne({ session_id: data.session_id });
            let checkUser = await users.findOne({ _id: checkSessionId.user });
            if (!checkUser) {
                return res.status(400).send(this.errorFormat({
                    'message': 'User not found'
                }, 'user', 400));
            }
            if (checkUser.kyc_statistics == null) {
                checkUser.kyc_statistics = "PENDING"
                checkUser.save();
            }


        }
        if (data.topic == 'check_completion') {
            let checkSessionId = await kycDetails.findOne({ session_id: data.session_id });
            let checkUser = await users.findOne({ _id: checkSessionId.user });
            if (!checkUser) {
                return res.status(400).send(this.errorFormat({
                    'message': 'User not found'
                }, 'user', 400));
            }
            // let date = new Date();
            // let timestamp = date.valueOf();
            // console.log("Timestamp:", timestamp);
            // let uuid = uuidv4();
            // let url = `https://api.yoti.com/idverify/v1/sessions/${data.session_id}?sdkId=${process.env.CLIENT_SDK_ID}&nonce=${uuid}&timestamp=${timestamp}`;
            // let text = `GET&/sessions/${data.session_id}?sdkId=${process.env.CLIENT_SDK_ID}&nonce=${uuid}&timestamp=${timestamp}`
            // let contents = await fs.readFileSync(__dirname + '/yoti-key/keys/Beldex-KYC-access-security.pem');
            // let key = new NodeRSA(contents, "pkcs1", { encryptionScheme: 'pkcs1' });
            // //key.importKey(contents, "pkcs1");
            // let encrypted = key.encrypt(text, 'base64');
            // console.log("Encrypted:", encrypted)
            // // let response = await axios.get(url, {
            // //     headers: {
            // //         'X-Yoti-Auth-Digest': encrypted,
            // //         'X-Yoti-Auth-Id': `${process.env.CLIENT_SDK_ID}`
            // //     }
            // // })
          
            if ([null, "PENDING"].indexOf(checkUser.kyc_statistics) > -1) {
                let request = new RequestBuilder()
                    .withBaseUrl(process.env.YOTI_BASE_URL)
                    .withPemFilePath(__dirname + '/yoti-key/keys/Beldex-KYC-access-security.pem')
                    .withEndpoint(`/sessions/${data.session_id}`)
                    .withMethod('GET')
                    .withQueryParam('sdkId', process.env.CLIENT_SDK_ID)
                    .build();
                let response = await request.execute()
                let attributes = response.parsedResponse.checks[0].report.recommendation;
                if (attributes.value == 'APPROVE') {
                    checkUser.kyc_verified = true;
                    checkUser.kyc_verified_date = moment().format('YYYY-MM-DD HH:mm:ss');
                    checkUser.kyc_statistics = "APPROVE"
                    checkUser.save();
                    await this.updateBalance(checkUser.user_id, checkUser._id, res, 'kyc_verified_reward');
                    let checkReferrerCode = await users.findOne({ referral_code: checkUser.referrer_code });
                    if (checkReferrerCode) {
                        let amount = await this.updateBalance(checkReferrerCode.user_id, checkReferrerCode._id, res, 'referrer_reward');
                        await new referralHistory({
                            user_id: checkUser._id,
                            referrer_code: check.referrer_code,
                            amount: amount,
                            created_date: moment().format('YYYY-MM-DD HH:mm:ss')
                        }).save()
                    }
                    let serviceData = {
                        "subject": `Your KYC verification was successful.`,
                        "email_for": "kyc-success",
                        "user_id": checkUser._id

                    };
                    await apiServices.sendEmailNotification(serviceData, res);
                }
                if (attributes.value == 'REJECT') {
                    checkUser.kyc_statistics = "REJECT"
                    checkUser.save();
                    let serviceData = {
                        "subject": `Your KYC verification could not be processed.`,
                        "email_for": "kyc-failure",
                        "user_id": checkUser._id

                    };
                    await apiServices.sendEmailNotification(serviceData, res);
                }
                if (attributes.value == 'NOT_AVAILABLE') {
                    checkUser.kyc_statistics = "NOT_AVAILABLE"
                    checkUser.save();
                    let serviceData = {
                        "subject": `Your KYC verification could not be processed.`,
                        "email_for": "kyc-failure",
                        "user_id": checkUser._id

                    };
                    await apiServices.sendEmailNotification(serviceData, res);
                }
            }

        }
        return
    }


    async referrerHistory(req, res) {

        let checkReferrerCode = await referralHistory
            .find({ referrer_code: req.params.code })
            .populate({
                path: 'user',
                select: 'email referral_code'
            })
            .exec()
        if (checkReferrerCode.length == 0) {
            return res.status(200).json(this.successFormat({
                "data": [],
            }, null, 'user', 200));
        }
        return res.status(200).json(this.successFormat({
            "data": checkReferrerCode,
        }, null, 'user', 200));
    }

    async updateBalance(user, userId, res, type) {
        let payloads;
        let checkSetting = await settings.findOne({ type: type });
        if (checkSetting) {
            payloads = {
                "user_id": user,
                "asset": "BDX",
                "business": "deposit",
                "business_id": user,
                "change": checkSetting.amount,
                "detial": {}
            }
            await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');
            let serviceData = {
                "subject": ` ${payloads.asset} - Deposit Confirmation`,
                "email_for": "deposit-notification",
                "amt": payloads.change,
                "coin": payloads.asset,
                "user_id": userId

            };
            await apiServices.sendEmailNotification(serviceData, res);
        }

        return payloads.change

    }

    async kycDetailsValidation(req) {
        let schema = Joi.object().keys({
            first_name: Joi.string().required(),
            middle_name: Joi.string().optional(),
            surname: Joi.string().optional(),
            date_of_birth: Joi.string().required(),
            address: Joi.string().required().max(100),
            g2f_code: Joi.string(),
            otp: Joi.string(),
        });

        return Joi.validate(req, schema, {
            abortEarly: false
        });
    }

    async kycDetails(req, res) {
        let data = req.body.data.attributes;
        let sessionResponse;
        data.user = req.user.user;
        let checkUser = await users.findOne({ _id: data.user })
        if (!checkUser) {
            return res.status(400).send(this.errorFormat({
                'message': 'User not found'
            }, 'user', 400));
        }

        if (data.otp == null || undefined) {
            return res.status(400).send(this.errorFormat({
                'message': 'Otp must be provide'
            }, 'user', 400));
        }
        let checkOtp = await this.validateOtpForEmail(req, res, "kyc details");
        if (checkOtp.status == false) {
            return res.status(400).send(this.errorFormat({
                'message': checkOtp.err
            }, 'user', 400));
        }

        let response = await this.kycSession(req, res, 'details');
        if (response.status) {
            sessionResponse = response.result.parsedResponse;
            data.session_id = sessionResponse.session_id;
            data.client_session_token = sessionResponse.client_session_token;
            checkUser.kyc_statistics = 'PENDING';
            checkUser.save();
            let check = await kycDetails.findOne({ user: data.user })

            if (check) {
                check.session_id = sessionResponse.session_id,
                    check.client_session_token = sessionResponse.client_session_token;
                check.save();
            } else {
                await new kycDetails(data).save();
            }
            let getData = {
                session_id: sessionResponse.session_id,
                client_session_token: sessionResponse.client_session_token
            }
            return res.status(200).send(this.successFormat(getData, null, 'user', 200))
        }
        else {
            return res.status(400).send(this.errorFormat({
                'message': response.error
            }, 'user', 400));
        }

    }

    async kycStatistics(req, res) {
        let checkUser = await users.findOne({ _id: req.user.user });
        if (checkUser) {
            return res.status(200).send(this.successFormat({
                'kyc_statistics': checkUser.kyc_statistics
            }, null, 'user', 200));
        }
        else {
            return res.status(400).send(this.errorFormat({
                'message': 'User not found'
            }, 'user', 400));
        }
    }

    async removeUnderScore(str) {
        let removeUnderScore = str.replace(/_/g, " ").toLowerCase();
        return removeUnderScore;
    }
}

module.exports = new User;
