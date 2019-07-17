const moment = require('moment');
const users = require('../db/users');
const apiServices = require('../services/api');
const deviceMangement = require('../db/device-management');
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

class User extends controller {

   async activate(req, res) {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash))
        let checkhash =await mangHash.findOne({email: userHash.email, hash: req.params.hash})
        {
            if(checkhash)
            {
                if(checkhash.is_active)
                {
                    return res.status(400).send(this.errorMsgFormat({
                            'message': 'Verification link -already used'
                        }));
                }
                else 
                {
                    await mangHash.findOneAndUpdate({ email: userHash.email, hash: req.params.hash, is_active: false, type_for: "registration" }, { is_active: true, created_date: moment().format('YYYY-MM-DD HH:mm:ss') })
                }
            }
            else{
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Verification link is expired'
                }));
            }
        }
        let date = new Date(userHash.date);
        let getSeconds = date.getSeconds() + config.get('activation.expiryTime');
        let duration = moment.duration(moment().diff(userHash.date));
        console.log('Second:', duration.asSeconds());
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
                return res.status(400).send(this.successFormat({
                    'message': 'Token is expired'
                }));

            }
            else {
                return res.status(400).send(this.successFormat({
                    'message': 'User not found'
                }));
            }
        }

    }

    async insertUser(result, res) {
        let inc = await sequence.findOneAndUpdate({ sequence_type: "users" }, {
            $inc: {
                login_seq: 1
            }
        });
        console.log("Increment:", inc);
        try {
            let user = await users.create({
                email: result.email,
                password: result.password,
                referral_code: result.referral_code,
                created_date: result.created_date,
                user_id: inc.login_seq
            });
            if (userTemp.removeUserTemp(result.id)) {

                // address creation
                await apiServices.initAddressCreation(user);

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
        let isChecked = await accountActive.findOne({ email: data.email });
        users.findOne({
            email: data.email,
            is_active: true
        })
            .exec()
            .then(async (result) => {
                if (!result) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'User not found, Please register your email'
                    }));
                } else if (result.is_active) {
                    let passwordCompare = bcrypt.compareSync(data.password, result.password);
                    if (passwordCompare == false) {

                        if (isChecked) {
                            if (isChecked.count <= config.get('accountActive.hmt')) {
                                await accountActive.findOneAndUpdate({ email: data.email },
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
                        }
                        else {
                            await new accountActive({ email: data.email, create_date: timeNow }).save();
                        }
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Invalid credentials'
                        }));
                    } else {
                        if(isChecked)
                        {
                            if (isChecked.count > config.get('accountActive.hmt')) {
                                let date = new Date(isChecked.create_date);
                                let getSeconds = date.getSeconds() + config.get('activation.expiryTime');
                                let duration = moment.duration(moment().diff(isChecked.create_date));
                                console.log('Second:', duration.asSeconds());
                                if (getSeconds > duration.asSeconds()) {
    
                                    return res.status(400).send(this.errorMsgFormat({
                                        'message': 'Account has been locked, please try again after 2 hours!'
                                    }));
                                }
                                else {
                                    await accountActive.deleteOne({email:data.email})
                                    // check that device is already exists or not
                                    this.checkDevice(req, res, result);
                                }
    
                            }
                            else {
                                await accountActive.deleteOne({email:data.email})
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
        console.log("Token:", token);
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
    async generatorOtpforEmail(user) {
        try {
            const rand = Math.random() * (999999 - 100000) + 100000;
            const getOtpType = await otpType.findOne({ otp_prefix: "BEL" });
            const otp = `${getOtpType.otp_prefix}-${Math.floor(rand)}`;
            const isChecked = await otpHistory.findOneAndUpdate({ user_id: user, is_active: false }, { count: 0, otp: otp, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') })
            if (!isChecked) {
                let data =
                {
                    otp_type: getOtpType._id,
                    user_id: user,
                    otp: otp,
                    create_date_time: moment().format('YYYY-MM-DD HH:mm:ss'),

                }
                await new otpHistory(data).save();
            }
            let serviceData =
            {
                subject: `Beldex login verification code  ${moment().format('YYYY-MM-DD HH:mm:ss')}( ${config.get('settings.timeZone')} )`,
                email_for: "otp-login",
                otp: Math.floor(rand),
                user_id: user
            }
            await apiServices.sendEmailNotification(serviceData);
            return { status: true }
        }
        catch (err) {
            return { status: false, error: err.message }
        }

    }

    async returnToken(res, result, loginHistory) {
        await users.findOneAndUpdate({ email: result.email }, { is_forget_active: false })
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
        let tokens = await this.storeToken(result, loginHistory);
        return res.status(200).send(this.successFormat({
            "token": tokens.accessToken,
            "refreshToken": tokens.refreshToken,
            "google_auth": result.google_auth,
            "sms_auth": result.sms_auth,
            "anti_spoofing": result.anti_spoofing,
            "anti_spoofing_code": result.anti_spoofing_code,
            "loggedIn": timeNow,
            "expiresIn": config.get('secrete.expiry')
        }, result._id));
    }

    async checkDevice(req, res, user) {
        let userID = user._id;
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');

        // Find some documents
        deviceMangement.countDocuments({
            user: userID
        }, async (err, count) => {
            console.log("count:", count);
            if (!count) {
                const device = await this.insertDevice(req, userID, true);
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
                    let loginHistoryId = await this.insertLoginHistory(req, userID, device._id, timeNow);
                    await this.returnToken(res, user, loginHistoryId._id)

                }
                else {
                    const isChecked = await this.generatorOtpforEmail(userID);
                    if (isChecked.status) {
                        res.status(200).send(this.successFormat({
                            'message': "Send a OTP on your email",
                            "device_id": device._id,
                            "region": req.body.data.attributes.region,
                            "city": req.body.data.attributes.city,
                            "ip": req.body.data.attributes.ip
                        }, userID))
                    }
                    else {
                        return res.status(500).send(this.errorMsgFormat({
                            'message': isChecked.error
                        }, 'users', 500));
                    }
                }


            } else {
                deviceMangement.findOne({
                    user: userID,
                    browser: req.body.data.attributes.browser,
                    region: req.body.data.attributes.region,
                    city: req.body.data.attributes.city,
                    os: req.body.data.attributes.os,
                    verified: true,
                    is_deleted: false
                })
                    .exec()
                    .then(async (result) => {
                        console.log("Result:", result);
                        if (!result) {
                            // insert new device records
                            await this.insertDevice(req, userID);
                            let urlHash = this.encryptHash({
                                "user_id": userID,
                                "ip": req.body.data.attributes.ip,
                                "browser": req.body.data.attributes.browser,
                                "verified": true
                            });

                            // send email notification
                            this.sendNotificationForAuthorize({
                                "subject": `Authorize New Device/Location ${req.body.data.attributes.ip} - ${timeNow} ( ${config.get('settings.timeZone')} )`,
                                "email_for": "user-authorize",
                                "device": `${req.body.data.attributes.browser} ${req.body.data.attributes.browser_version} ( ${req.body.data.attributes.os} )`,
                                "location": `${req.body.data.attributes.city} ${req.body.data.attributes.country}`,
                                "ip": req.body.data.attributes.ip,
                                "hash": urlHash,
                                "user_id": userID
                            })
                            return res.status(401).send(this.errorMsgFormat({
                                'msg': 'unauthorized',
                                'hash': urlHash
                            }, 'users', 401));
                        } else {

                            const device = await this.insertDevice(req, userID, true);
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

                                let loginHistoryId = await this.insertLoginHistory(req, userID, device._id, timeNow);
                                await this.returnToken(res, user, loginHistoryId._id)
                            }
                            else {
                                const isChecked = await this.generatorOtpforEmail(userID);
                                if (isChecked.status) {
                                    res.status(200).send(this.successFormat({
                                        'message': "Send a OTP on your email",
                                        "device_id": device._id,
                                        "region": req.body.data.attributes.region,
                                        "city": req.body.data.attributes.city,
                                        "ip": req.body.data.attributes.ip
                                    }, userID))
                                }
                                else {
                                    return res.status(500).send(this.errorMsgFormat({
                                        'message': isChecked.error
                                    }, 'users', 500));
                                }
                            }

                        }
                    });
            }
        });
    }


    async validateOtpForEmail(req, res) {
        try {
            let data = req.body.data.attributes;
            console.log('data:', data.ip);
            let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
            const isChecked = await otpHistory.findOne({ user_id: data.user_id, otp: data.otp, is_active: false });
            if (isChecked) {
                let date = new Date(isChecked.create_date_time);
                let getSeconds = date.getSeconds() + config.get('otpForEmail.timeExpiry');
                let duration = moment.duration(moment().diff(isChecked.create_date_time));
                if (getSeconds > duration.asSeconds()) {
                    let isCheckedDevice = await deviceMangement.findOne({ _id: data.device_id })
                    if (isCheckedDevice) {
                        const loginHistory = await this.insertLoginHistory(req, data.user_id, isCheckedDevice._id, timeNow);
                        // send email notification
                        let isCheckedDeviceManagement = await deviceMangement.findOne({ region: data.region, city: data.city, ip: data.ip })
                        if (!isCheckedDeviceManagement) {

                            this.sendNotification({
                                'ip': data.ip,
                                'time': timeNow,
                                'browser': isCheckedDevice.browser,
                                'browser_version': isCheckedDevice.browser_version,
                                'os': isCheckedDevice.os,
                                'user_id': data.user_id
                            });
                        }

                        let checkUser = await users.findOne({ _id: data.user_id });
                        await otpHistory.findOneAndUpdate({ _id: isChecked._id }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                        await this.returnToken(res, checkUser, loginHistory._id);
                    }
                }
                else {
                    await otpHistory.findOneAndUpdate({ user_id: data.user_id, is_active: false }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss'), time_expiry: 'Yes' })
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid OTP or OTP is expired.'
                    }));
                }


            }
            else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid OTP'
                }));
            }
        }
        catch (err) {
            return res.status(500).send(this.errorMsgFormat({
                'message': err.message
            }, 'users', 500));
        }


    }
    async resendOtpForEmail(req, res) {
        let data = req.body.data.attributes;
        const isChecked = await otpHistory.findOne({ user_id: data.user_id, is_active: false });
        if (isChecked) {
            if (isChecked.count < config.get('otpForEmail.hmt')) {
                let count = isChecked.count++;
                let inCount = ++count;
                const rand = Math.random() * (999999 - 100000) + 100000
                const getOtpType = await otpType.findOne({ otp_prefix: "BEL" });
                let serviceData =
                {
                    subject: `Beldex login verification code  ${moment().format('YYYY-MM-DD HH:mm:ss')}( ${config.get('settings.timeZone')} )`,
                    email_for: "otp-login",
                    otp: Math.floor(rand),
                    user_id: data.user_id
                }
                await apiServices.sendEmailNotification(serviceData);
                await otpHistory.findOneAndUpdate({ user_id: data.user_id, is_active: false }, { count: inCount, otp: `${getOtpType.otp_prefix}-${Math.floor(rand)}`, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });

                res.status(200).send(this.successFormat({
                    'message': "Send a OTP on your email"
                }, data.user_id))
            }
            else {
                await otpHistory.findOneAndUpdate({ user_id: data.user_id, is_active: false }, { is_active: true, create_date_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                return res.status(400).send(this.errorMsgFormat({
                    'message': ` OTP resent request exceeded, please login again `
                }, 'users', 400));
            }
        }
        else {
            let isChecked = await this.generatorOtpforEmail(data.user_id)
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
    sendNotificationForAuthorize(data) {
        return apiServices.sendEmailNotification(data);
    }

    // send email notification to the registered user
    sendNotification(data) {
        let serviceData = {
            "subject": `Successful Login From IP ${data.ip} - ${data.time} ( ${config.get('settings.timeZone')} )`,
            "email_for": "user-login",
            "device": `${data.browser} ${data.browser_version} ( ${data.os} )`,
            "time": data.time,
            "ip": data.ip,
            "user_id": data.user_id
        };

        return apiServices.sendEmailNotification(serviceData);
    }

    insertDevice(req, userID, verify = false, cb) {
        let data = {
            user: userID,
            is_browser: req.body.data.attributes.is_browser,
            is_mobile: req.body.data.attributes.is_mobile,
            os: req.body.data.attributes.os,
            os_byte: req.body.data.attributes.os_byte,
            browser: req.body.data.attributes.browser,
            browser_version: req.body.data.attributes.browser_version,
            ip: req.body.data.attributes.ip,
            city: req.body.data.attributes.city,
            region: req.body.data.attributes.region,
            country: req.body.data.attributes.country,
            verified: verify
        };

        return new deviceMangement(data).save();
    }

    async insertLoginHistory(req, userID, deviceID, timeNow) {

        let data = {
            user: userID,
            device: deviceID,
            auth_type: req.body.data.attributes.auth_type ? req.body.data.attributes.auth_type : 1,
            login_date_time: timeNow
        }
        return new loginHistory(data).save();
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
                        select: '-_id -user -created_date -__v'
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

    patchWhiteListIP(req, res) {

        let deviceHash = JSON.parse(helpers.decrypt(req.params.hash));
        console.log("Hash:", deviceHash);
        if (deviceHash.data.user_id) {
            let checkExpired = this.checkTimeExpired(deviceHash.data.datetime);
            if (checkExpired) {
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
                            this.updateWhiteListIP(deviceHash, res);
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

    updateWhiteListIP(hash, res) {

        // find and update the reccord
        deviceMangement.updateMany({
            'browser': hash.data.browser,
            'user': hash.data.user_id,
        }, {
                verified: hash.data.verified
            }, (err, device) => {
                if (err) {
                    return res.status(404).send(this.errorMsgFormat({
                        'message': 'Invalid device.'
                    }));
                } else {
                    return res.status(202).send(this.successFormat({
                        'message': 'Your IP address whitelisted Now you can able to login..'
                    }, device.user, 'users', 202));
                }
            });
    }

    settingsValidate(req) {
        let schema = Joi.object().keys({
            sms_auth: Joi.bool().optional(),
            password: Joi.string().optional(),
            google_auth: Joi.boolean().optional(),
            google_secrete_key: Joi.string().optional(),
            mobile: Joi.number().optional(),
            mobile_code: Joi.number().optional(),
            anti_spoofing: Joi.boolean().optional(),
            anti_spoofing_code: Joi.string().optional(),
            white_list_address: Joi.boolean().optional()
        });

        return Joi.validate(req, schema, {
            abortEarly: false
        });
    }

    patchSettings(req, res) {
        let requestData = req.body.data.attributes;
        if (requestData.code !== undefined) {
            let userHash = JSON.parse(helpers.decrypt(requestData.code));
            requestData.is_active = userHash.is_active;
        }

        if (req.body.data.id !== undefined && Object.keys(requestData).length) {

            // find and update the reccord
            users.findOneAndUpdate({
                _id: req.body.data.id
            }, {
                    $set: requestData
                })
                .then(result => {
                    return res.status(202).send(this.successFormat({
                        'message': 'Your request is updated successfully.'
                    }, result._id, 'users', 202));
                })
                .catch(err => {
                    return res.status(500).send(this.errorMsgFormat({
                        'message': err.message
                    }, 'users', 500));
                });
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request.'
            }, 'users', 400));
        }
    }

    disableAccount(req, res) {
        let requestedData = req.body.data.attributes;
        let userHash = JSON.parse(helpers.decrypt(requestedData.code));
        if (userHash.is_active !== undefined) {
            this.patchSettings(req, res);
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

            return this.updateG2F(req, res)
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request'
            }));
        }
    }

    async updateG2F(req, res) {
        let check = await this.postVerifyG2F(req, res, 'boolean');
        if (check === true) {
            // delete password attribute
            delete req.body.data.attributes.password;

            return this.patchSettings(req, res);
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Incorrect code'
            }));
        }
    }

    async verifyG2F(req, res, type, google_secrete_key) {
        let opts = {
            beforeDrift: 2,
            afterDrift: 2,
            drift: 4,
            step: 30
        };
        let counter = Math.floor(Date.now() / 1000 / opts.step);
        let returnStatus = await g2fa.verifyHOTP(google_secrete_key, req.body.data.attributes.g2f_code, counter, opts);
        if (type === 'boolean') {
            return returnStatus;
        } else {
            if (returnStatus === true) {
                return res.status(200).send(this.successFormat({
                    'status': returnStatus
                }, '2factor', 200));
            } else {
                return res.status(400).send(this.successFormat({
                    'status': returnStatus,
                    'message': 'Incorrect code'
                }, '2factor', 400));
            }
        }
    }

    async postVerifyG2F(req, res, type = 'json') {
        let requestedData = req.body.data.attributes;
        if (requestedData.g2f_code !== undefined) {
            if (requestedData.google_secrete_key === undefined) {
                let result = await users.findById(req.body.data.id).exec();
                if (!result) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid data'
                    }));
                }
                return this.verifyG2F(req, res, type, result.google_secrete_key);
            } else {
                return this.verifyG2F(req, res, type, requestedData.google_secrete_key);
            }
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request'
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
        let data = req.body.data.attributes;
        if (data.market_name !== null && data.market_name != undefined) {
            let isCheckMarket = await addMarket.findOne({ market_name: data.market_name })
            if (isCheckMarket) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': "Market is already in the list"
                }, 'users', 400));
            }
            await new addMarket(data).save();
            return res.status(200).send(this.successFormat({
                'message': 'Add Market',
            }));
        }
        else {
            return res.status(400).send(this.errorMsgFormat({
                'message': "market_name is required."
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
            res.status(200).send(this.successFormat({
                isChecked
            }))
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
        console.log(ismarket._id);
        let fav = isfavourite.market;
        let index = fav.indexOf(ismarket._id);
        if (index > -1) {
            fav.splice(index, 1);
        }
        console.log('fav:', fav);
        await favourite.findOneAndUpdate({ user: req.user.user }, { market: fav });
        return res.status(200).send(this.successFormat({
            'message': 'Remove market to your favourite list',
        }));

    }
}

module.exports = new User;