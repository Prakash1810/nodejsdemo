const moment = require('moment');
const assets = require('../db/assets');
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
const rewardHistory = require('../db/reward-history');
const kycDetails = require('../db/kyc-details');
const transaction = require('../db/transactions');
const branca = require("branca")(config.get('encryption.realKey'));
const fs = require('fs');
const _ = require('lodash');
const kyc = require('./kyc');
const configs = require('../db/config');
const audits = require('../db/auditlog-history');
const apikey = require('../db/api-keys');
const { RequestBuilder, Payload } = require('yoti');
const authenticators = require('authenticator')
const changeCurrency = require('../db/currency-list');



class User extends controller {

    async activate(req, res) {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash))
        let checkhash = await mangHash.findOne({ email: userHash.email, hash: req.params.hash })
        if (checkhash) {
            if (checkhash.is_active) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'The verification link has already been used.'
                }));
            }
            else {
                await mangHash.findOneAndUpdate({ email: userHash.email, hash: req.params.hash, is_active: false, type_for: "registration" }, { is_active: true, count: 1, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
            }
        }
        else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Hash cannot be found'
            }));
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
                                'message': 'User cannot be found.'
                            }));
                        }
                    });
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'The verification link has expired. Please register again.'
                }));
            }
        }
        else {
            if (userTemp.removeUserTemp(userHash.id)) {
                await accountActive.deleteOne({ email: userHash.email, type_for: 'register' })
                return res.status(400).send(this.errorFormat({
                    'message': 'The verification link has expired. Please register again.'
                }));
            }
            else {
                return res.status(400).send(this.errorFormat({
                    'message': 'The verification link has already used may be expired.'
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
                referrer_code: result.referrer_code,
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
                await this.updateBalance(inc.login_seq, user._id, res, 'email verification');
                return res.status(200).send(this.successFormat({
                    'message': `Congratulation!, Your account has been successfully activated.`
                }));
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'User cannot be found.'
                }));
            }
        }
        catch (err) {
            return res.status(500).send(this.errorMsgFormat(err))
        }
    }

    async infoToken(deviceInfo) {
        let tokenOption = {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: config.get('secrete.infoToken')
        };

        return await jwt.sign(deviceInfo, config.get('secrete.infokey'), tokenOption);
    };

    async createToken(user, id, device_id) {

        let jwtOptions = {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: `${(device_id) ? config.get('secrete.mobileExpiry') : config.get('secrete.expiry')}`
        };

        let tokenAccess = JSON.stringify({
            user: user._id,
            login_id: id,
            user_id: user.user_id
        });

        let token = branca.encode(tokenAccess);
        return await jwt.sign({ token }, config.get('secrete.key'), jwtOptions);
    };

    async createRefreshToken(user, id) {

        let options = {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: config.get('secrete.refreshTokenExpiry')

        };
        const tokenRefresh = JSON.stringify({
            user: user._id,
            login_id: id,
            user_id: user.user_id,
        });
        let tokenUser = branca.encode(tokenRefresh);
        return await jwt.sign({ tokenUser }, config.get('secrete.refreshKey'), options);




    }

    async storeToken(user, loginHistory, infoToken, mobileDevice) {
        let refreshToken = null, info = null;
        if (infoToken != null) {
            info = await this.infoToken(infoToken);
            await new token({
                user: user.id,
                info_token: info,
                type_for: "info-token",
                created_date: Date.now()
            }).save()
        }
        let accessToken = await this.createToken(user, loginHistory, mobileDevice);
        if (mobileDevice == null) {
            refreshToken = await this.createRefreshToken(user, loginHistory);
        }
        let data = {
            user: user._id,
            type_for: "token",
            access_token: accessToken,
            refresh_token: refreshToken,
            created_date: Date.now()
        }
        await new token(data).save();
        return { accessToken: accessToken, refreshToken: refreshToken, infoToken: info }
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
                        'message': 'User cannot be found, Please register your email.'
                    }));
                }
                else if (!result.is_active) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Your account has been disabled. Please contact support.',
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
                                let date = new Date(isChecked.create_date);
                                let getSeconds = date.getSeconds() + config.get('accountActive.timeExpiry');
                                let duration = moment.duration(moment().diff(isChecked.create_date));
                                if (getSeconds > duration.asSeconds()) {
                                    if (isChecked.count == config.get('accountActive.check')) {
                                        await accountActive.findOneAndUpdate({ email: data.email, type_for: 'login' },
                                            {
                                                $inc: {
                                                    count: 1
                                                },
                                                create_date: timeNow
                                            })
                                    }
                                    return res.status(400).send(this.errorMsgFormat({
                                        'message': 'Your account has been locked due to multiple login attempts. Please try again after 2 hours.'
                                    }));
                                } else {
                                    return res.status(400).send(this.errorMsgFormat({
                                        'message': 'The password you entered is incorrect.'
                                    }));

                                }

                            }
                            if (isChecked.count > config.get('accountActive.limit')) {
                                return res.status(400).send(this.errorMsgFormat({
                                    'message': `The email address and password you entered do not match. You have ${config.get('accountActive.hmt') - isChecked.count + 1}  attempt${(config.get('accountActive.hmt') - isChecked.count) + 1 > 1 ? 's' : ''} left`
                                }));
                            }
                        }
                        else {
                            await new accountActive({ email: data.email, create_date: timeNow, type_for: 'login' }).save();
                        }

                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'The password you entered is incorrect.'
                        }));
                    } else {
                        if (isChecked) {
                            if ((config.get('accountActive.check') + 1) == isChecked.count) {
                                let date = new Date(isChecked.create_date);
                                let getSeconds = date.getSeconds() + config.get('accountActive.timeExpiry');
                                let duration = moment.duration(moment().diff(isChecked.create_date));
                                if (getSeconds > duration.asSeconds()) {

                                    return res.status(400).send(this.errorMsgFormat({
                                        'message': 'Your account has been locked due to multiple login attempts. Please try again after 2 hours.'
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
                        'message': 'Your account has been disabled. Please contact support.'
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
                        required: 'Please enter your {{label}} address.',
                        regex: {
                            base: 'Please enter a valid {{label}} address.'
                        }
                    }
                }
            }).label("email"),
            password: Joi.string().required().options({
                language: {
                    string: {
                        required: 'Please enter a {{label}}.',
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
    validateOtp(req) {
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
            otp: Joi.string().required(),
            is_app: Joi.boolean().optional()
        });

        return Joi.validate(req, schema, {
            abortEarly: false
        });
    }

    deviceValidate(data) {
        let schema = Joi.object().keys({
            is_browser: Joi.boolean().required(),
            is_mobile: Joi.boolean().required(),
            is_app: Joi.boolean().optional(),
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
                        'message': 'Email address not found.'
                    }));
                }
            })
            .catch(err => {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Email address not found.'
                }));
            });
    }

    getTokenToUserId(req, res, data = 'json') {
        let token = req.headers.authorization;
        try {
            let verifyToken = jwt.verify(token, config.get('secrete.key'));
            const decoded = JSON.parse(branca.decode(verifyToken.token));
            if (data === 'json') {
                return res.status(200).json({
                    "code": 200,
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
                message: "Authentication failed. Your request could not be authenticated."
            }, 'user', 401));
        }
    }
    async generatorOtpforEmail(user, typeFor = 'login', res) {
        try {
            const rand = Math.random() * (999999 - 100000) + 100000;
            const getOtpType = await otpType.findOne({ otp_prefix: "BEL" });
            const otp = `${getOtpType.otp_prefix}-${Math.floor(rand)}`;
            console.log("")
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
                'message': "An OTP has been sent to your registered email address."
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

    async returnToken(req, res, result, type, mobileId) {
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
        let take = req.body.data.attributes;
        take['info'] = req.body.data.id;
        let tokens = await this.storeToken(result, loginHistory._id, take, mobileId);
        await deviceWhitelist.findOneAndUpdate({ user: result._id }, { last_login_ip: attributes.ip, modified_date: moment().format('YYYY-MM-DD HH:mm:ss') })
        return res.status(200).send(this.successFormat({
            "apiKey": result.api_key,
            "info": tokens.infoToken,
            "token": tokens.accessToken,
            "refreshToken": tokens.refreshToken,
            "google_auth": result.google_auth,
            "sms_auth": result.sms_auth,
            "anti_spoofing": result.anti_spoofing,
            "anti_spoofing_code": result.anti_spoofing_code,
            'white_list_address': result.white_list_address,
            "withdraw": result.withdraw,
            "taker_fee": result.taker_fee,
            "maker_fee": result.maker_fee,
            "kyc_verified": result.kyc_verified,
            "trade": result.trade,
            "expiresIn": config.get('secrete.expiry'),
            "referral_code": result.referral_code,
            "currency_code": result.currency_code
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
                    'message': "Your google authentication was successful.",
                    "google_auth": isAuth.google_auth,
                    "sms_auth": isAuth.sms_auth,

                }, userID))

            }
            else {
                const isChecked = await this.generatorOtpforEmail(userID, "login", res);
                if (isChecked.status) {
                    await this.addWhitelist(data, userID, true);
                    res.status(200).send(this.successFormat({
                        'message': "An OTP has been sent to your registered email address.",
                        'otp': true,
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
                is_deleted: false,
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
                    'message': 'Your are logging in from a new device. We have sent a verification link to your registered email. Please check your email and authorize this device to continue.',
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
                        'message': "Your google authentication was successful.",
                        "google_auth": isAuth.google_auth,
                        "sms_auth": isAuth.sms_auth,

                    }, userID))

                }
                else {
                    const isChecked = await this.generatorOtpforEmail(userID, "login", res);
                    if (isChecked.status) {
                        res.status(200).send(this.successFormat({
                            'message': "An OTP has been sent to your registered email address.",
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
            let id = req.body.data.id;
            let deviceId = null;
            if (data.is_app && data.is_mobile) {
                if (req.headers.device) {
                    deviceId = req.headers.device;
                } else {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Device_id must be provided.'
                    }));

                }

            }
            const isChecked = await otpHistory.findOne({ user_id: id, otp: data.otp, is_active: false, type_for: typeFor });
            if (isChecked) {
                let date = new Date(isChecked.create_date_time);
                let getSeconds = date.getSeconds() + config.get('otpForEmail.timeExpiry');
                let duration = moment.duration(moment().diff(isChecked.create_date_time));
                if (getSeconds > duration.asSeconds()) {
                    if (typeFor == "login") {
                        let checkUser = await users.findById({ _id: id });
                        await otpHistory.findOneAndUpdate({ _id: isChecked._id, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                        delete data.otp;
                        delete data.g2f_code;
                        await this.returnToken(req, res, checkUser, 1, deviceId);
                    }
                    else {
                        await otpHistory.findOneAndUpdate({ _id: isChecked._id, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                        return { status: true }
                    }

                }
                else {
                    await otpHistory.findOneAndUpdate({ user_id: id, is_active: false, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss'), time_expiry: 'Yes' })
                    if (typeFor !== 'login') {
                        return { status: false, err: 'OTP has expired.' }
                    }
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'OTP has expired.'
                    }));

                }


            }
            else {
                if (typeFor !== 'login') {
                    return { status: false, err: 'OTP entered is invalid' }
                }
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'OTP entered is invalid'
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
                    'message': "An OTP has been sent to your registered email address."
                }, data.user_id))
            }
            else {
                await otpHistory.findOneAndUpdate({ user_id: data.user_id, is_active: false, type_for: typeFor }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                return res.status(400).send(this.errorMsgFormat({
                    'message': `OTP resend request limit has exceeded. Please login again to continue.`
                }, 'users', 400));
            }
        }
        else {
            let isChecked = await this.generatorOtpforEmail(data.user_id, typeFor, res)
            if (isChecked.status) {
                res.status(200).send(this.successFormat({
                    'message': "An OTP has been sent to your registered email address."
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
            is_app: attributes.is_app,
            mobile_id: req.headers.device,
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
                "message": "Invalid page number. The page number should start with 1."
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
                "message": "Invalid page number. The page number should start with 1."
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
                        'message': "This link has expired. Please login to continue."
                    }));
                }
                if (check.is_active) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': "This link has already been used."
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
                                    'message': 'The device cannot be found. Please login to continue.'
                                }));
                            } else {
                                this.updateWhiteListIP(deviceHash, req, res);
                            }
                        });
                }
                else {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'This link has expired. Please login to continue.'
                    }));
                }
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'Invalid request. Please login to continue.'
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
                    'message': 'Invalid request.Please login to continue.'
                }));
            } else {
                await mangHash.findOneAndUpdate({ email: hash.data.email, hash: req.params.hash, type_for: 'new_authorize_device', }, { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') });
                await deviceWhitelist.findOneAndUpdate({ user: hash.data.user_id, verified: false }, { verified: true, modified_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                return res.status(202).send(this.successFormat({
                    'message': 'Your device has been authorized. Please login to continue.'
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

    g2fSettingValidate(req) {
        let schema = Joi.object().keys({
            password: Joi.string().required(),
            google_auth: Joi.boolean().required().valid(true),
            google_secrete_key: Joi.string().required(),
            g2f_code: Joi.string().required()
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
                            'message': 'The google authentication code you entered is incorrect.'
                        }, 'user', 400));
                    }
                }
                else {
                    if (requestData.hasOwnProperty('anti_spoofing') || requestData.hasOwnProperty('white_list_address') || requestData.hasOwnProperty('anti_spoofing_code')) {
                        if (!requestData.type) {
                            return res.status(400).send(this.errorFormat({
                                'message': 'Invalid request.'
                            }, 'user', 400));
                        }
                        if (requestData.otp == null || undefined) {
                            return res.status(400).send(this.errorFormat({
                                'message': 'Otp must be provided'
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
                        'message': 'The changes you made were saved successfully.'
                    }, null, 'users', 202));
                }
                else {
                    if (type == 'withCallPatchSetting' || type == 'disable') {
                        return { status: false }
                    }
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid request. The changes you made were not saved.'
                    }, 'users', 400));
                }
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'ID must be provided.'
                }, 'users', 400));
            }
        } catch (error) {
            return res.status(400).send(this.errorMsgFormat({
                'message': error.message
            }, 'patchSetting', 400));
        }

    }

    async disableAccount(req, res) {
        try {
            let requestedData = req.body.data.attributes;
            let userHash = JSON.parse(helpers.decrypt(requestedData.code));
            if (userHash.is_active !== undefined) {
                let checkActive = await users.findOne({ _id: req.body.data.id });
                if (!checkActive) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'User cannot be found',
                    }, 'users', 400));

                }
                if (checkActive.is_active == false) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Your account has been disabled. Please contact support.',
                    }, 'users', 400));
                }
                else {
                    let checked = await this.patchSettings(req, res, 'disable');
                    if (checked.status) {
                        return res.status(202).send(this.successFormat({
                            'message': 'You have disabled your account. If you need assistance, please contact our support team.'
                        }, null, 'users', 202));
                    }
                    else {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Invalid request. The changes you made were not saved.'
                        }, 'users', 400));
                    }
                }

            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid request..'
                }, 'users', 400));
            }

        }
        catch (error) {
            return res.status(400).send(this.errorMsgFormat({
                'message': error.message
            }, 'users', 400));

        }

    }

    async insert2faAuth(req, res) {

        console.log(req.user.user)
        let checkUser = await users.findOne({ _id: req.user.user });
        if (checkUser.google_auth || checkUser.google_secrete_key) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Your 2factor already created.'
            }));
        }
        else {
            let formattedKey = authenticators.generateKey().replace(/\W/g, '').substring(0, 20).toLowerCase();
            let auth = authenticators.generateTotpUri(formattedKey, checkUser.email, config.get('secrete.issuer'), 'SHA1', 6, 30);
            return res.status(200).send(this.successFormat({
                'googleKey': formattedKey,
                'googleQR': auth,
                'message': 'You have successfully created googleKey.'
            }));

        }
    }

    async patch2FAuth(req, res) {
        let requestedData = req.body.data.attributes;
        if ((requestedData.password !== undefined && requestedData.g2f_code !== undefined) && req.body.data.id != undefined) {
            let result = await users.findById(req.body.data.id).exec();
            if (!result) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'User cannot be found.'
                }));
            } else if (requestedData.password !== undefined) {
                let passwordCompare = bcrypt.compareSync(requestedData.password, result.password);
                if (passwordCompare == false) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'The password you entered is incorrect.'
                    }));
                }
            }

            let checked = await this.updateG2F(req, res);
            if (checked.status) {
                return res.status(202).send(this.successFormat({
                    'message': 'You have successfully enabled google two factor authentication.'
                }, null, 'users', 202));
            }
            else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid request. The changes you made were not saved.'
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
                'message': 'The google authentication code you entered is invalid. Please enter a valid code.'
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

            let returnStatus;
            if (google_secrete_key.length === config.get('g2fLength.length')) {
                returnStatus = await g2fa.verifyHOTP(google_secrete_key, data.g2f_code, counter, opts);
            }
            else {
                returnStatus = await authenticators.verifyToken(google_secrete_key, data.g2f_code);
                if (returnStatus) {
                    if (returnStatus.delta) {
                        returnStatus = true;
                    } else {
                        returnStatus = true;
                    }

                } else {
                    returnStatus = false;
                }
            }

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
            if (req.headers.authorization && req.headers.info && type != 'boolean') {
                let isChecked = await apiServices.authentication(req);
                let isCheckedInfo = await apiServices.authenticationInfo(req);
                if (!isChecked.status || !isCheckedInfo) {
                    return res.status(401).json(this.errorMsgFormat({
                        message: "Authentication failed. Your request could not be authenticated."
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
                            'message': 'Invalid request. Please provide your key to continue.'
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
                    'message': 'Google authentication code must be provided.'
                }, '2factor', 400));
            }
        } catch (err) {
            return res.status(400).send(this.errorMsgFormat({
                'message': err.message
            }, '2factor', 400));
        }

    }

    async refreshToken(req, res) {
        try {
            const user = await users.findOne({
                _id: req.user.user
            })

            if (user) {
                await token.findOneAndUpdate({ user: user._id, refresh_token: req.headers.authorization, is_deleted: false, type_for: 'token' }, { is_deleted: true, modified_date: Date.now() });

                let tokens = await this.storeToken(user, req.user.login_id, null, null);
                let result = {
                    "apiKey": user.api_key,
                    "token": tokens.accessToken,
                    "refreshToken": tokens.refreshToken,
                    "google_auth": user.google_auth,
                    "sms_auth": user.sms_auth,
                    "anti_spoofing": user.anti_spoofing,
                    "anti_spoofing_code": user.anti_spoofing_code,
                    'white_list_address': user.white_list_address,
                    "withdraw": user.withdraw,
                    "kyc_verified": user.kyc_verified,
                    "expiresIn": config.get('secrete.expiry'),
                    "trade": user.trade,
                };
                return res.status(200).send(this.successFormat(result, tokens.id))
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'User cannot be found'
                }, 'users', 404))
            }
        } catch (err) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }
    }

    async logout(user, tokens, res) {
        try {
            if (!tokens.info) {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'Info Token must be provided.'
                }, 'users', 404))
            }
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
                    user: user.user, info_token: tokens.info, is_deleted: false, type_for: "info_token"
                }, { is_deleted: true })
                await token.findOneAndUpdate({
                    user: user.user, access_token: tokens.authorization, is_deleted: false, type_for: "token"
                }, { is_deleted: true })
                return res.status(200).send(this.successFormat({
                    'message': 'You have successfully logged out.',
                }))
            }
            else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'User cannot be found'
                }, 'users', 404))
            }

        } catch (err) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }
    }

    async deleteWhiteList(data, res) {
        try {
            const deleteWhiteLists = await deviceMangement.updateMany({
                browser: data.browser,
                browser_version: data.browser_version,
                os: data.os,
                user: data.user,
                is_deleted: false
            }, {
                is_deleted: true
            });
            await deviceWhitelist.updateMany({
                browser: data.browser,
                os: data.os,
                user: data.user,
                is_deleted: false
            }, {
                is_deleted: true
            });

            if (deleteWhiteLists.nModified != 0) {
                return res.status(200).send(this.successFormat({
                    'message': 'The device has been successfully deleted.',
                }));
            } else {
                return res.status(404).send(this.errorMsgFormat({
                    'message': 'Device cannot be found.'
                }, 'users', 404));
            }

        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }
    }

    async addMarkets(req, res) {
        // let market = await apiServices.matchingEngineRequestForMarketList('market/list', req, res, 'withAdd');

        // if (market.status) {
        //     let data = market.result;
        //     for (var i = 0; i < data.length; i++) {
        //         let isCheckMarket = await addMarket.findOne({ market_name: data[i].name });
        //         if (!isCheckMarket) {
        //             let request = {
        //                 market_name: data[i].name,
        //                 market_pair: data[i].money
        //             }
        //             await new addMarket(request).save();
        //         }
        //     }


        //     return res.status(200).send(this.successFormat({
        //         'message': 'Add Market',
        //     }));
        // }
        // else {
        //     return res.status(400).send(this.errorMsgFormat({
        //         'message': "Data not found "
        //     }, 'users', 400));
        // }
        let i = 0;
        let asset = await assets.find({});
        if (asset.length != 0) {
            while (i < asset.length) {
                if (asset[i].asset_code != 'USDT') {
                    if (asset[i].markets.length != 0) {
                        let market = asset[i].markets;
                        let j = 0;
                        while (j < market.length) {
                            if (asset[i].asset_code != market[j]) {
                                let checkMarket = await addMarket.findOne({ market_name: `${asset[i].asset_code}${market[j]}` });
                                if (!checkMarket) {
                                    let request = {
                                        asset: asset[i]._id,
                                        market_name: `${asset[i].asset_code}${market[j]}`,
                                        market_pair: market[j]
                                    }
                                    await new addMarket(request).save();
                                }
                            }
                            j++
                        }
                    }
                }

                i++
            }
            return res.status(200).send(this.successFormat({
                'message': 'The markets has been added.',
            }));
        } else {
            return res.status(404).send(this.errorMsgFormat({
                'message': "Assets cannot be found."
            }, 'users', 404));
        }
    }

    async marketList(req, res) {
        let isChecked = await addMarket.find({});
        if (isChecked.length == 0) {
            return res.status(404).send(this.errorMsgFormat({
                'message': "Markets cannot be found."
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
                'message': "Market cannot be Found."
            }, 'users', 404));
        }

        let isCheckUser = await favourite.findOne({ user: req.user.user });
        if (isCheckUser) {
            let id = isCheckUser.market;
            id.push(isChecked._id);
            await favourite.findOneAndUpdate({ _id: isCheckUser._id }, { market: id })
            return res.status(200).send(this.successFormat({
                'message': 'The market has been added to your favourites.',
            }));
        }
        await new favourite(
            {
                user: req.user.user,
                market: isChecked._id
            }).save();
        return res.status(200).send(this.successFormat({
            'message': 'The market has been added to your favourites.',
        }));

    }
    async updateFavourite(req, res) {
        let data = req.body.data.attributes.market;
        let ismarket = await addMarket.findOne({ market_name: data.toUpperCase() });
        if (!ismarket) {
            return res.status(404).send(this.errorMsgFormat({
                'message': "Market cannot be Found."
            }, 'users', 404));
        }
        let isfavourite = await favourite.findOne({ user: req.user.user });
        if (!isfavourite) {
            return res.status(404).send(this.errorMsgFormat({
                'message': "The market could not be found in your favourites."
            }, 'users', 404));
        }
        let fav = isfavourite.market;
        let index = fav.indexOf(ismarket._id);
        if (index > -1) {
            fav.splice(index, 1);
        }
        await favourite.findOneAndUpdate({ user: req.user.user }, { market: fav });
        return res.status(200).send(this.successFormat({
            'message': 'The market has been deleted from your favourites.',
        }));

    }

    async withdrawActive(user, res) {
        let checkUser = await users.findOne({ _id: user })
        if (!checkUser) {
            return res.status(400).send(this.errorFormat({
                'message': 'User cannot be found.'
            }));
        }
        if (!checkUser.withdraw) {
            let date = new Date(checkUser.password_reset_time);
            let getSeconds = date.getSeconds() + config.get('withdrawActive.timeExpiry');
            let duration = moment.duration(moment().diff(checkUser.password_reset_time));
            if (getSeconds > duration.asSeconds()) {
                return res.status(400).send(this.errorFormat({
                    'message': `Your password was recently changed. You cannot make a withdrawal for 24 hours.`
                }));
            }
            else {
                checkUser.withdraw = true;
                checkUser.save();
                return res.status(200).send(this.successFormat({
                    'message': 'You can be proceed withdraw.'
                }, null, 'user', 200));
            }
        }
        return res.status(400).send(this.errorFormat({
            'message': 'Withdrawals are disabled for your account. Please contact our support for assistance.'
        }));

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
                return { status: false, error: `Invalid request.` };
            }
            return res.status(400).send(this.errorFormat({
                'message': `Invalid request.`
            }));
        }
    }

    async kycUpdate(req, res) {

        let data = req.body;
        // console.log("Data:", data);
        if (data.topic == 'resource_update') {
            let checkSessionId = await kycDetails.findOne({ session_id: data.session_id });
            let checkUser = await users.findOne({ _id: checkSessionId.user });
            if (!checkUser) {
                return res.status(400).send(this.errorFormat({
                    'message': 'User cannot be found.'
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
                    'message': 'User cannot be found.'
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
                    await this.updateBalance(checkUser.user_id, checkUser._id, res, 'kyc verification');
                    let checkReferrerCode = await users.findOne({ referral_code: checkUser.referrer_code });
                    if (checkReferrerCode) {
                        let amount = await this.updateBalance(checkReferrerCode.user_id, checkReferrerCode._id, res, 'referral reward-kyc');
                        if (amount == null) {
                            return;
                        }
                        await new referralHistory({
                            user: checkUser._id,
                            referrer_code: checkUser.referrer_code,
                            email: checkUser.email,
                            type: "referral code",
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

    async rewardHistory(req, res) {
        let data = await rewardHistory.find({ user: req.user.user })
            .select('is_referral type reward reward_asset created_date ')
            .exec();
        if (!data.length) {
            return res.status(200).json(this.successFormat({
                "data": [],
            }, null, 200, 0));
        } else {
            return res.status(200).json(this.successFormat(data, null, 'user', 200));
        }
    }

    async updateBalance(user, userId, res, type) {
        try {
            let payloads;
            let checkSetting = await configs.findOne({ key: type, is_active: true });
            let date = new Date();
            if (checkSetting) {
                payloads = {
                    "user_id": user,
                    "asset": checkSetting.value.reward_asset,
                    "business": "deposit",
                    "business_id": date.valueOf(),
                    "change": checkSetting.value.reward,
                    "detial": {}
                }
                await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');

                await new rewardHistory({
                    user: userId,
                    user_id: user,
                    type: type,
                    reward: payloads.change,
                    reward_asset: payloads.asset,
                    is_referral: type == 'referral reward-kyc' ? true : false,
                    created_date: moment().format('YYYY-MM-DD HH:mm:ss')
                }).save()

                let serviceData = {
                    "subject": ` ${payloads.asset} - Deposit Confirmation`,
                    "email_for": "deposit-notification",
                    "amt": payloads.change,
                    "coin": payloads.asset,
                    "user_id": userId

                };
                await apiServices.sendEmailNotification(serviceData, res);
                return payloads.change;
            } else {
                return null;
            }


        }
        catch (err) {
            return res.status(500).send(controller.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }

    }

    async kycDetailsValidation(req) {
        let schema = Joi.object().keys({
            first_name: Joi.string().required(),
            middle_name: Joi.string().optional().allow(''),
            surname: Joi.string().required(),
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
                'message': 'User cannot be found.'
            }, 'user', 400));
        }

        if (data.otp == null || undefined) {
            return res.status(400).send(this.errorFormat({
                'message': 'Please enter the OTP.'
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
                'message': 'User cannot be found'
            }, 'user', 400));
        }
    }

    async removeUnderScore(str) {
        let removeUnderScore = str.replace(/_/g, " ").toLowerCase();
        return removeUnderScore;
    }

    async active(req, res) {
        // let data = await transaction.find({});
        // data.date = data.created_date;
        // data.create_date = null;
        // data.save();
        // let data = {
        //     key: "referral reward-deposit",
        //     value: {
        //         "reward": "50",
        //         "reward_asset": "BDX",
        //  }
        // "kyc verification":{
        //     "reward":"50",
        //     "reward_asset":"BDX",
        //     "active":true
        // },
        // "deposit verification":{
        //     "reward":"50",
        //     "reward_asset":"BDX",
        //     "active":true
        // },
        // "referral reward-kyc":{
        //     "reward":"50",
        //     "reward_asset":"BDX",
        //     "active":true
        // },
        // "referral reward-deposit":{
        //     "reward":"50",
        //     "reward_asset":"BDX",
        //     "active":true
        // }
        // }

        //await new configs(data).save();
        // data.type

        // let i = 0;
        // let checkUser = await users.find({ kyc_verified: true });
        // while (i < checkUser.length) {
        //     await this.approveupdateBalance(checkUser[i].user_id, checkUser[i]._id, res, 'kyc_verified_reward', "BDX");
        //     let checkReferrerCode = await users.findOne({ referral_code: checkUser[i].referrer_code });
        //     if (checkReferrerCode) {
        //         let amount = await this.approveupdateBalance(checkReferrerCode.user_id, checkReferrerCode._id, res, 'referrer_reward', 'BDX');
        //         await new referralHistory({
        //             user: checkUser[i]._id,
        //             email: checkUser[i].email,
        //             type: "referral reward",
        //             referrer_code: checkUser[i].referrer_code,
        //             amount: amount,
        //             created_date: moment().format('YYYY-MM-DD HH:mm:ss')
        //         }).save()
        //     }
        //     // console.log("I:",i);
        //     i++;
        // }

        // return res.status(200).send(this.successFormat(done, null, 'user', 200));
    }

    async approveupdateBalance(user, userId, res, type) {
        let payloads;
        let checkSetting = await settings.findOne({ type: type });
        let date = new Date();
        if (checkSetting) {
            payloads = {
                "user_id": user,
                "asset": "BDX",
                "business": "deposit",
                "business_id": date.valueOf(),
                "change": checkSetting.amount,
                "detial": {}
            }
            //let matching = await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');
            //console.log("Matching Response:",matching);

        }

        return payloads.change

    }

    async apiKeyValidation(req) {
        let schema = Joi.object().keys({
            type: Joi.string().required(),
            passphrase: joi.string().alphanum().required().min(5).max(8),
            g2f_code: Joi.string().required()
        });
        return Joi.validate(req, schema, {
            abortEarly: false
        });
    }


    async checkApikey(req, res) {
        let checkUserValidate = await users.findOne({ _id: req.user.user });
        req.body.data['id'] = req.user.user;
        req.body.data.attributes.google_secrete_key = checkUserValidate.google_secrete_key;
        let requestData = req.body.data.attributes;
        if (!requestData.g2f_code) {
            return res.status(400).send(this.errorFormat({
                'message': 'Google authentication code must be provided.'
            }, 'user', 400));
        }
        let check = await this.postVerifyG2F(req, res, 'boolean');
        if (check.status == false) {
            return res.status(400).send(this.errorFormat({
                'message': 'The google authentication code you entered is incorrect.'
            }, '2factor', 400));
        }
        switch (requestData.type) {
            case 'remove':
                let checkApiKeyRemove = await apikey.findOne({ user: req.body.data.id, is_deleted: false });
                if (!checkApiKeyRemove) {
                    return res.status(400).send(this.errorMsgFormat({ message: 'API key cannot be found.Please create you API key.' }, 'user', 400));
                }
                let validateUuidSplit = checkApiKeyRemove.apikey.split('-');
                const apiSecretRemove = await helpers.createSecret(`${validateUuidSplit[0]}-${validateUuidSplit[validateUuidSplit.length - 1]}`, requestData.passphrase);
                if (checkApiKeyRemove.secretkey === apiSecretRemove) {
                    await apikey.findOneAndUpdate({ _id: checkApiKeyRemove.id }, { is_deleted: true, modified_date: moment().format('YYYY-MM-DD HH:mm:ss') });
                    await users.findOneAndUpdate({ _id: checkUserValidate.id }, { api_key: null });
                    return res.status(200).send(this.successFormat({ message: 'API key deleted.' }, 'user', 200));
                }
                else {
                    return res.status(400).send(this.errorMsgFormat({ message: 'The API key entered is incorrect.' }, 'user', 400));
                }
            case 'create':
                let checkUser = await apikey.findOne({ user: req.body.data.id, is_deleted: false });
                if (checkUser) {
                    return res.status(400).send(this.errorMsgFormat({ message: 'An API key is already available for this account.' }, 'user', 400));
                }
                const apiKey = await helpers.generateUuid();
                let uuidSplit = apiKey.split('-');
                const apiSecret = await helpers.createSecret(`${uuidSplit[0]}-${uuidSplit[uuidSplit.length - 1]}`, requestData.passphrase);
                await users.findOneAndUpdate({ _id: checkUserValidate.id }, { api_key: uuidSplit[0] });
                await new apikey({
                    user: req.user.user,
                    user_id: req.user.user_id,
                    apikey: apiKey,
                    secretkey: apiSecret,
                    type: requestData.type
                }).save();
                return res.status(200).send(this.successFormat({ 'apikey': apiKey, 'secretkey': apiSecret, message: 'Your API key was created successfully.', }, 'user', 200));
            case 'view':
                let validateApiKey = await apikey.findOne({ user: req.body.data.id, is_deleted: false });
                if (!validateApiKey) {
                    return res.status(400).send(this.errorMsgFormat({ message: 'API key cannot be found.Please create you API key.' }, 'user', 400));
                }
                let creatUuidSplit = validateApiKey.apikey.split('-');
                const apiSecretValidate = await helpers.createSecret(`${creatUuidSplit[0]}-${creatUuidSplit[creatUuidSplit.length - 1]}`, requestData.passphrase);
                if (validateApiKey.secretkey === apiSecretValidate) {
                    return res.status(200).send(this.successFormat({ 'apikey': validateApiKey.apikey, 'secretkey': apiSecretValidate, message: 'Your API key was successfully validated.' }, 'user', 200));
                } else {
                    return res.status(400).send(this.errorMsgFormat({ message: 'The API key you entered is incorrect.' }, 'user', 400));
                }
        }
    }

    async listCurrencies(req, res) {
        let currencyList = await changeCurrency.find({});
        let currency = [], i = 0;
        while (i < currencyList.length) {
            currency.push({ code: currencyList[i].code, currencyName: currencyList[i].currency_name });
            i++;
        }
        return res.status(200).send(this.successFormat(currency, 'currency', 200));
    }

    async changeCurrency(req, res) {
        let currency = req.body.data.attributes;
        if (!currency.code) {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Currency code must be provide.'
            }));
        }
        let change = await changeCurrency.findOne({ code: currency.code });
        if (!change) {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Currency cannot be found.'
            }));
        }
        let currencyPrice = await apiServices.marketPrice('bitcoin', currency.code.toLowerCase());
        let price = currencyPrice.data.bitcoin[currency.code.toLowerCase()];
        await users.findOneAndUpdate({ _id: req.user.user }, { currency_code: currency.code })
        return res.status(200).send(this.successFormat({
            'currencyPrice': price
        }, 'currecy'));
    }



}

module.exports = new User;
