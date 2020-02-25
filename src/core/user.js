const moment = require('moment');
const assets = require('../db/assets');
const userAddress = require('../db/user-address');
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
const trade = require('../db/user-trades');
const rewardBalance = require('../db/reward-balance');
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
const balance = require('../db/balance');
const { deviceValidation } = require('../validation/user.validations');
const managementToken = require('../db/management-token');
const withdrawDiscount = require('../db/withdraw-discount');
const votingUserList = require('../db/voted-users-list');
const votingCoinList = require('../db/voting-coin-list');
const votingPhase = require('../db/voting-phase');
const banner = require('../db/banner');
const tradeVolume = require('../db/user-trade-volumes');

class User extends controller {

    async activate(req, res) {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash, res))
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
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'The verification link has expired. Please register again.'
                }));
            }
            else {
                return res.status(400).send(this.errorMsgFormat({
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
            let userCreate = Object.assign({}, {
                email: result.email,
                password: result.password,
                referral_code: code,
                referrer_code: result.referrer_code,
                created_date: result.created_date,
                user_id: inc.login_seq,
                taker_fee: (await fee.findOne({ config: 'takerFeeRate' })).value,
                maker_fee: (await fee.findOne({ config: 'makerFeeRate' })).value
            });
            let user = await users.create(userCreate);
            console.log("create:", user)

            if (userTemp.removeUserTemp(result.id)) {

                // address creation;
                await accountActive.deleteOne({ email: result.email, type_for: 'register' })
                await apiServices.initAddressCreation(user);
                //welcome mail
                let serviceData = Object.assign({}, {
                    subject: "Welcome to Beldex",
                    email_for: "welcome",
                    to_email: user.email,
                    link: `${process.env.LINKURL}${code}`
                });
                await apiServices.sendEmailNotification(serviceData, res);
                //await this.updateBalance(inc.login_seq, user._id, res, 'email verification');
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
        let tokenOption = Object.assign({}, {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: config.get('secrete.infoToken')
        });
        return await jwt.sign(deviceInfo, config.get('secrete.infokey'), tokenOption);
    };

    async createToken(user, id, device_id) {
        let jwtOptions = Object.assign({}, {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: `${(device_id) ? config.get('secrete.mobileExpiry') : config.get('secrete.expiry')}`
        });
        let tokenAccess = Object.assign({}, {
            user: user._id,
            login_id: id,
            user_id: user.user_id
        });
        let token = branca.encode(JSON.stringify(tokenAccess));
        return await jwt.sign({ token }, config.get('secrete.key'), jwtOptions);
    };

    async createRefreshToken(user, id) {
        let options = Object.assign({}, {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: config.get('secrete.refreshTokenExpiry')

        });
        const tokenRefresh = Object.assign({}, {
            user: user._id,
            login_id: id,
            user_id: user.user_id,
        });
        let tokenUser = branca.encode(JSON.stringify(tokenRefresh));
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
        let data = Object.assign({}, {
            user: user._id,
            type_for: "token",
            access_token: accessToken,
            refresh_token: refreshToken,
            created_date: Date.now()
        });
        await new token(data).save();
        return { accessToken: accessToken, refreshToken: refreshToken, infoToken: info }
    }

    async userEncryption(req, res) {
        let data = req.body.data.attributes;
        if (data.value) {
            let encryptionData = await helpers.encrypt(data.value);
            return res.status(200).send(this.successFormat({ data: encryptionData }));
        }
        return res.status(400).send(this.errorFormat({ message: 'Your request cannot be processed.' }));
    }

    async login(req, res) {
        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
        let data = req.body.data.attributes;
        let isChecked = await accountActive.findOne({ email: data.email, type_for: 'login' });
        data.password = await helpers.decrypt(data.password, res);
        if (data.password === '') {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Your request was not encrypted.'
            }));
        }

        users.findOne({
            email: data.email
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
                message: "Authentication failed. Your request could not be authenticated."
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
                let data = Object.assign({}, {
                    otp_type: getOtpType._id,
                    user_id: user,
                    otp: otp,
                    create_date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
                    type_for: typeFor
                });

                await new otpHistory(data).save();
            }
            let serviceData = Object.assign({}, {
                subject: `Beldex ${typeFor == 'login' ? 'login' : typeFor} verification code  ${moment().format('YYYY-MM-DD HH:mm:ss')} ( ${config.get('settings.timeZone')} )`,
                email_for: "otp-login",
                otp: Math.floor(rand),
                user_id: user
            });
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
            let sendNotificationData = Object.assign({}, {
                'ip': attributes.ip,
                'time': timeNow,
                'browser': attributes.browser,
                'browser_version': attributes.browser_version,
                'os': attributes.os,
                'user_id': result._id
            });
            this.sendNotification(sendNotificationData, res);
        }
        const device = await this.insertDevice(req, res, result._id, true, 'withValidation');
        let data = Object.assign({}, {
            user: result._id,
            device: device._id,
            auth_type: type,
            login_date_time: timeNow
        });
        let loginHistory = await this.insertLoginHistory(data);
        let take = req.body.data.attributes;
        take['info'] = req.body.data.id;
        let tokens = await this.storeToken(result, loginHistory._id, take, mobileId);
        await deviceWhitelist.findOneAndUpdate({ user: result._id }, { last_login_ip: attributes.ip, modified_date: moment().format('YYYY-MM-DD HH:mm:ss') });
        await users.findOneAndUpdate({ _id: result._id }, { last_login_time: moment().format('YYYY-MM-DD HH:mm:ss') });

        let responseData = Object.assign({}, {
            "apiKey": result.api_key,
            "info": tokens.infoToken,
            "token": tokens.accessToken,
            "refreshToken": tokens.refreshToken,
            "google_auth": result.google_auth,
            "sms_auth": result.sms_auth,
            "anti_spoofing": result.anti_spoofing,
            "anti_spoofing_code": result.anti_spoofing ? result.anti_spoofing_code : null,
            'white_list_address': result.white_list_address,
            "withdraw": result.withdraw,
            "taker_fee": Number(result.taker_fee) * 100,
            "maker_fee": Number(result.maker_fee) * 100,
            "kyc_verified": result.kyc_verified,
            "trade": result.trade,
            "expiresIn": 300000,
            "referral_code": result.referral_code,
            "currency_code": result.currency_code,
            "current_device": `${take.os}-${take.browser}-${take.browser_version}`
        });
        return res.status(200).send(this.successFormat(responseData, result._id));
    }

    async addWhitelist(data, userID, verify = false) {
        let addDeviceList = Object.assign({}, {
            user: userID,
            browser: data.browser,
            region: data.region,
            city: data.city,
            os: data.os,
            verified: verify
        });
        return await new deviceWhitelist(addDeviceList).save();

    }

    async checkDevice(req, res, user) {
        let userID = user._id;
        let data = req.body.data.attributes;
        let nonAddressCreatedUser = [], i = 0;
        let assetCheck = await assets.find({});
        let userAddressCheck = await userAddress.find({ user: userID });
        if (assetCheck.length !== userAddressCheck.length) {
            nonAddressCreatedUser = assetCheck.filter(userAssets => userAddressCheck.every((userAddress) => JSON.stringify(userAddress.asset) !== JSON.stringify(userAssets._id)));
            while (i < nonAddressCreatedUser.length) {
                let userAddressGen = Object.assign({}, {
                    "coin": nonAddressCreatedUser[i].asset_code,
                    "user_id": user.user_id,
                    "user": user._id,
                    "asset": nonAddressCreatedUser[i]._id
                });
                await apiServices.axiosAPI(userAddressGen);
                i++;
            }
        };

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
                    let resData = Object.assign({}, {
                        'message': "An OTP has been sent to your registered email address.",
                        'otp': true,
                        "region": data.region,
                        "city": data.city,
                        "ip": data.ip
                    });
                    res.status(200).send(this.successFormat(resData, userID))
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
                let hashEncryption = Object.assign({}, {
                    "user_id": userID,
                    "email": data.email,
                    "ip": data.ip,
                    "browser": data.browser,
                    "verified": true
                });
                let urlHash = this.encryptHash(hashEncryption);

                // send email notification
                let deviceAuthNotification = Object.assign({}, {
                    "subject": `Authorize New Device/Location ${data.ip} - ${timeNow} ( ${config.get('settings.timeZone')} )`,
                    "email_for": "user-authorize",
                    "device": `${data.browser} ${data.browser_version} ( ${data.os} )`,
                    "location": `${data.city} ${data.country}`,
                    "ip": data.ip,
                    "hash": urlHash,
                    "user_id": userID
                });
                this.sendNotificationForAuthorize(deviceAuthNotification, res)
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
                });
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
                        let responseData = Object.assign({}, {
                            'message': "An OTP has been sent to your registered email address.",
                            "region": data.region,
                            "city": data.city,
                            "ip": data.ip
                        });
                        res.status(200).send(this.successFormat(responseData, userID))
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

    async resendOtpForEmail(req, res, typeFor) {
        let data = req.body.data.attributes;
        const isChecked = await otpHistory.findOne({ user_id: data.user_id, is_active: false, type_for: typeFor });
        if (isChecked) {
            if (isChecked.count <= config.get('otpForEmail.hmt')) {
                let count = isChecked.count++;
                let inCount = ++count;
                const rand = Math.random() * (999999 - 100000) + 100000
                const getOtpType = await otpType.findOne({ otp_prefix: "BEL" });
                let serviceData = Object.assign({}, {
                    subject: `Beldex ${typeFor == "login" ? "login" : typeFor} verification code  ${moment().format('YYYY-MM-DD HH:mm:ss')} ( ${config.get('settings.timeZone')} )`,
                    email_for: "otp-login",
                    otp: Math.floor(rand),
                    user_id: data.user_id
                });
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
        let serviceData = Object.assign({}, {
            "subject": `Successful Login From IP ${data.ip} - ${data.time} ( ${config.get('settings.timeZone')} )`,
            "email_for": "user-login",
            "device": `${data.browser} ${data.browser_version} ( ${data.os} )`,
            "time": data.time,
            "ip": data.ip,
            "user_id": data.user_id
        });

        return apiServices.sendEmailNotification(serviceData, res);
    }

    async insertDevice(req, res, userID, verify = false, type = 'withoutValidation') {
        if (type != 'withoutValidation') {
            let { error } = await deviceValidation(req.body.data.attributes);
            if (error) {
                return res.status(400).send(this.errorFormat(error, 'users', 400));
            }
        }
        let attributes = req.body.data.attributes;
        let data = Object.assign({}, {
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
        });

        return new deviceMangement(data).save();
    }

    async insertLoginHistory(data) {
        let attributes = Object.assign({}, {
            user: data.user,
            device: data.device,
            auth_type: data.auth_type,
            login_date_time: data.login_date_time
        });
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
            let deviceHash = JSON.parse(helpers.decrypt(req.params.hash, res));

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

    async patchSettings(req, res, type = 'withoutCallPatchSetting') {
        try {
            let requestData = req.body.data.attributes;
            if (type != 'disable') {
                req.body.data.id = req.user.user;
            }
            if (type != 'withCallPatchSetting' || type == 'withg2f') {
                if (requestData.password) {
                    requestData.password = await helpers.decrypt(requestData.password, res);
                    if (requestData.password === '') {
                        return res.status(400).send(this.errorMsgFormat({
                            message: 'Your request was not encrypted.'
                        }));
                    }
                }
                if (requestData.google_secrete_key) {
                    requestData.google_secrete_key = await helpers.decrypt(requestData.google_secrete_key, res);
                    if (requestData.google_secrete_key === '') {
                        return res.status(400).send(this.errorMsgFormat({
                            message: 'Your request was not encrypted.'
                        }));
                    }
                }
            }
            if (requestData.code !== undefined) {
                let userHash = JSON.parse(helpers.decrypt(requestData.code, res));
                requestData.is_active = userHash.is_active;
            }
            if (type != 'withCallPatchSetting' && type != 'disable') {

                let check = await users.findOne({ _id: req.body.data.id, google_auth: true });
                if (check) {
                    let isChecked = await this.postVerifyG2F(req, res, 'setting');
                    if (isChecked.status == false) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'The google authentication code you entered is incorrect.'
                        }, 'user', 400));
                    }
                }
                else {
                    if (requestData.hasOwnProperty('anti_spoofing') || requestData.hasOwnProperty('white_list_address') || requestData.hasOwnProperty('anti_spoofing_code')) {
                        if (!requestData.type) {
                            return res.status(400).send(this.errorMsgFormat({
                                'message': 'Invalid request.'
                            }, 'user', 400));
                        }
                        if (requestData.otp == null || undefined) {
                            return res.status(400).send(this.errorMsgFormat({
                                'message': 'Otp must be provided'
                            }, 'user', 400));
                        }
                        req.body.data['id'] = req.user.user;
                        let checkOtp = await this.validateOtpForEmail(req, res, requestData.type);
                        if (checkOtp.status == false) {
                            return res.status(400).send(this.errorMsgFormat({
                                'message': checkOtp.err
                            }, 'user', 400));
                        }

                    }
                }
            }
            if (req.body.data.id !== undefined && Object.keys(requestData).length) {
                if (requestData.google_secrete_key) {
                    requestData.google_secrete_key = helpers.encrypt(requestData.google_secrete_key);
                }
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
                    if (requestData.hasOwnProperty('white_list_address')) {
                        await apiServices.publishNotification(update.user_id, { 'white_list_address': requestData.white_list_address, 'logout': false });
                    }
                    if (requestData.hasOwnProperty('anti_spoofing')) {
                        await apiServices.publishNotification(update.user_id, { 'anti_spoofing': requestData.anti_spoofing, 'anti_spoofing_code': requestData.anti_spoofing_code ? requestData.anti_spoofing_code : null, 'logout': false });
                    }
                    return res.status(202).send(this.successFormat({
                        'message': 'The changes you made were saved successfully.'
                    }, null, 'users', 202));
                }
                else {
                    if (type == 'withCallPatchSetting' || type == 'disable') {
                        return { status: false, err: 'Invalid request. The changes you made were not saved.' }
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
            let userHash = JSON.parse(helpers.decrypt(requestedData.code, res));
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
                        await apiServices.publishNotification(checkActive.user_id, { 'disable': true, 'logout': true });
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
        let checkUser = await users.findOne({ _id: req.user.user });
        if (checkUser.google_auth) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Your 2factor already created.'
            }));
        }
        else {
            let formattedKey = authenticators.generateKey().replace(/\W/g, '').substring(0, 16).toLowerCase();
            let auth = authenticators.generateTotpUri(formattedKey, checkUser.email, process.env.G2F_HOST_NAME, 'SHA1', 6, 30);
            return res.status(200).send(this.successFormat({
                'googleKey': formattedKey,
                'googleQR': auth,
                'message': 'You have successfully created googleKey.'
            }));

        }
    }

    async patch2FAuth(req, res) {
        let requestedData = req.body.data.attributes;
        requestedData.password = await helpers.decrypt(requestedData.password, res);
        if (requestedData.password === '') {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Your request was not encrypted.'
            }));
        }
        if (requestedData.google_secrete_key) {
            requestedData.google_secrete_key = await helpers.decrypt(requestedData.google_secrete_key, res);
            if (requestedData.google_secrete_key === '') {
                return res.status(400).send(this.errorMsgFormat({
                    message: 'Your request was not encrypted.'
                }));
            }
        }
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
                await apiServices.publishNotification(result.user_id, { 'g2fEnabled': requestedData.google_auth, 'logout': false });
                return res.status(202).send(this.successFormat({
                    'message': `${(requestedData.google_auth) ? 'You have successfully enable google two factor authentication.' : 'You have successfully disable google two factor authentication.'}`
                }, null, 'users', 202));
            }
            else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': checked.err
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
            let check = await this.patchSettings(req, res, 'withCallPatchSetting');
            if (check.status == true) {
                return { status: true }
            } else {
                return { status: false, err: check.err }
            }

        } else {
            return { status: false, err: 'The google authentication code you entered is invalid. Please enter a valid code.' }
        }
    }

    async verifyG2F(req, res, type, google_secrete_key, method = "withoutVerify") {
        try {
            let data = req.body.data.attributes;
            let userG2fLength = 0;;
            let opts = Object.assign({}, {
                beforeDrift: 2,
                afterDrift: 2,
                drift: 4,
                step: 30
            });
            let counter = Math.floor(Date.now() / 1000 / opts.step);

            let returnStatus, user = null;
            if (data.google_secrete_key && google_secrete_key) {
                user = await users.findOneAndUpdate({ _id: req.body.data.id, modified_date: { $gte: config.get('g2fDateCheck.start'), $lte: config.get('g2fDateCheck.end') } }, { modified_date: new Date() });

            } else {
                user = await users.findOne({ _id: req.body.data.id, modified_date: { $gte: config.get('g2fDateCheck.start'), $lte: config.get('g2fDateCheck.end') } });
                if (user) {
                    userG2fLength = user['google_secrete_key'].length;
                }

            }
            if (userG2fLength === config.get('g2fOldLength.length')) {
                returnStatus = await g2fa.verifyHOTP(google_secrete_key, data.g2f_code, counter, opts);
            }
            else {
                returnStatus = await authenticators.verifyToken(google_secrete_key, data.g2f_code)
                if (google_secrete_key.length === 20) {
                    if (returnStatus) {
                        returnStatus = returnStatus.delta == 1 ? true : false
                    } else {
                        returnStatus = false;
                    }
                }
                else {
                    if (returnStatus) {
                        returnStatus = returnStatus.delta == 0 ? true : false
                    } else {
                        returnStatus = false;
                    }

                }

            }

            if (returnStatus) {
                if (method == 'withoutAuth' && type != 'boolean') {
                    let user = await users.findOne({ _id: req.body.data.id });
                    delete data.g2f_code;
                    delete data.google_secrete_key;
                    await this.returnToken(req, res, user, 2, req.headers.device)
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

                    return res.status(400).send(this.errorMsgFormat({
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
                if (requestedData.google_secrete_key === undefined && requestedData.google_secrete_key == null) {

                    let result = await users.findById(req.body.data.id).exec();
                    result.google_secrete_key = await helpers.decrypt(result.google_secrete_key, res);

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
                let result = Object.assign({}, {
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
                    "expiresIn": 300000,
                    "trade": user.trade,
                });
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
                await users.findOneAndUpdate({ _id: user.user }, { last_logout_time: moment().format('YYYY-MM-DD HH:mm:ss') });
                await token.findOneAndUpdate({ user: user.user, access_token: tokens.authorization, is_deleted: false }, { is_deleted: true });
                await token.findOneAndUpdate({ user: user.user, info_token: tokens.info, is_deleted: false }, { is_deleted: true });
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
                await apiServices.publishNotification(data.user_id, { 'current_device': `${data.os}-${data.browser}-${data.browser_version}`, 'logout': false });
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
                                    let request = Object.assign({}, {
                                        asset: asset[i]._id,
                                        market_name: `${asset[i].asset_code}${market[j]}`,
                                        market_pair: market[j]
                                    });
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
            return res.status(400).send(this.errorMsgFormat({
                'message': 'User cannot be found.'
            }));
        }
        if (!checkUser.withdraw) {
            let date = new Date(checkUser.password_reset_time);
            let getSeconds = date.getSeconds() + config.get('withdrawActive.timeExpiry');
            let duration = moment.duration(moment().diff(checkUser.password_reset_time));
            if (getSeconds > duration.asSeconds()) {
                return res.status(400).send(this.errorMsgFormat({
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
        return res.status(400).send(this.errorMsgFormat({
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
            return res.status(400).send(this.errorMsgFormat({
                'message': `Invalid request.`
            }));
        }
    }

    async kycUpdate(req, res) {

        let data = req.body;
        if (data.type == 'verification_approved') {

            let check = await kycDetails.findOne({ uid: data.data.user_id });
            if (!check) {
                return
            }
            let updateUser = await users.findOneAndUpdate({ _id: check.user }, { kyc_verified: true, kyc_statistics: "APPROVE", kyc_verified_date: new Date() })
            await apiServices.publishNotification(req.user.user_id, { 'kyc_statistics': 'APPROVE', 'logout': false });
            //await this.updateBalance(updateUser.user_id, updateUser._id, res, 'kyc verification');
            if (updateUser) {
                let serviceData = Object.assign({}, {
                    "subject": `Your KYC verification was successful.`,
                    "email_for": "kyc-success",
                    "user_id": updateUser._id

                });
                await apiServices.sendEmailNotification(serviceData, res);
            }
        }

        // if (data.topic == 'resource_update') {
        //     let checkSessionId = await kycDetails.findOne({ session_id: data.session_id });
        //     let checkUser = await users.findOne({ _id: checkSessionId.user });
        //     if (!checkUser) {
        //         return res.status(400).send(this.errorMsgFormat({
        //             'message': 'User cannot be found.'
        //         }, 'user', 400));
        //     }
        //     if (checkUser.kyc_statistics == null) {
        //         checkUser.kyc_statistics = "PENDING"
        //         checkUser.save();
        //     }


        // }
        // if (data.topic == 'check_completion') {
        //     let checkSessionId = await kycDetails.findOne({ session_id: data.session_id });
        //     let checkUser = await users.findOne({ _id: checkSessionId.user });
        //     if (!checkUser) {
        //         return res.status(400).send(this.errorMsgFormat({
        //             'message': 'User cannot be found.'
        //         }, 'user', 400));
        //     }
        //     // let date = new Date();
        //     // let timestamp = date.valueOf();
        //     // console.log("Timestamp:", timestamp);
        //     // let uuid = uuidv4();
        //     // let url = `https://api.yoti.com/idverify/v1/sessions/${data.session_id}?sdkId=${process.env.CLIENT_SDK_ID}&nonce=${uuid}&timestamp=${timestamp}`;
        //     // let text = `GET&/sessions/${data.session_id}?sdkId=${process.env.CLIENT_SDK_ID}&nonce=${uuid}&timestamp=${timestamp}`
        //     // let contents = await fs.readFileSync(__dirname + '/yoti-key/keys/Beldex-KYC-access-security.pem');
        //     // let key = new NodeRSA(contents, "pkcs1", { encryptionScheme: 'pkcs1' });
        //     // //key.importKey(contents, "pkcs1");
        //     // let encrypted = key.encrypt(text, 'base64');
        //     // console.log("Encrypted:", encrypted)
        //     // // let response = await axios.get(url, {
        //     // //     headers: {
        //     // //         'X-Yoti-Auth-Digest': encrypted,
        //     // //         'X-Yoti-Auth-Id': `${process.env.CLIENT_SDK_ID}`
        //     // //     }
        //     // // })

        //     if ([null, "PENDING"].indexOf(checkUser.kyc_statistics) > -1) {
        //         let request = new RequestBuilder()
        //             .withBaseUrl(process.env.YOTI_BASE_URL)
        //             .withPemFilePath(__dirname + '/yoti-key/keys/Beldex-KYC-access-security.pem')
        //             .withEndpoint(`/sessions/${data.session_id}`)
        //             .withMethod('GET')
        //             .withQueryParam('sdkId', process.env.CLIENT_SDK_ID)
        //             .build();
        //         let response = await request.execute()
        //         let attributes = response.parsedResponse.checks[0].report.recommendation;
        //         if (attributes.value == 'APPROVE') {
        //             checkUser.kyc_verified = true;
        //             checkUser.kyc_verified_date = moment().format('YYYY-MM-DD HH:mm:ss');
        //             checkUser.kyc_statistics = "APPROVE"
        //             checkUser.save();
        //            
        //             // let checkReferrerCode = await users.findOne({ referral_code: checkUser.referrer_code });
        //             // if (checkReferrerCode) {
        //             //     let amount = await this.updateBalance(checkReferrerCode.user_id, checkReferrerCode._id, res, 'referral reward-kyc');
        //             //     if (amount == null) {
        //             //         return;
        //             //     }
        //             //     await new referralHistory({
        //             //         user: checkUser._id,
        //             //         referrer_code: checkUser.referrer_code,
        //             //         email: checkUser.email,
        //             //         type: "referral code",
        //             //         amount: amount,
        //             //         created_date: moment().format('YYYY-MM-DD HH:mm:ss')
        //             //     }).save()
        //             // }
        //             let serviceData = {
        //                 "subject": `Your KYC verification was successful.`,
        //                 "email_for": "kyc-success",
        //                 "user_id": checkUser._id

        //             };
        //             await apiServices.sendEmailNotification(serviceData, res);
        //         }
        //         if (attributes.value == 'REJECT') {
        //             checkUser.kyc_statistics = "REJECT"
        //             checkUser.save();
        //             let serviceData = {
        //                 "subject": `Your KYC verification could not be processed.`,
        //                 "email_for": "kyc-failure",
        //                 "user_id": checkUser._id

        //             };
        //             await apiServices.sendEmailNotification(serviceData, res);
        //         }
        //         if (attributes.value == 'NOT_AVAILABLE') {
        //             checkUser.kyc_statistics = "NOT_AVAILABLE"
        //             checkUser.save();
        //             let serviceData = {
        //                 "subject": `Your KYC verification could not be processed.`,
        //                 "email_for": "kyc-failure",
        //                 "user_id": checkUser._id

        //             };
        //             await apiServices.sendEmailNotification(serviceData, res);
        //         }
        //     }

        // }
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
                // payloads = {
                //     "user_id": user,
                //     "asset": checkSetting.value.reward_asset,
                //     "business": "deposit",
                //     "business_id": date.valueOf(),
                //     "change": checkSetting.value.reward,
                //     "detial": {}
                // }
                // await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');
                let checkReward = await rewardBalance.findOne({ user: userId });
                if (checkReward) {
                    checkReward.reward += Number(checkSetting.value.reward)
                    checkReward.save();
                } else {
                    await new rewardBalance({
                        user: userId,
                        reward_asset: checkSetting.value.reward_asset,
                        reward: Number(checkSetting.value.reward)
                    }).save()
                }
                let addRewardHistory = Object.assign({}, {
                    user: userId,
                    user_id: user,
                    type: type,
                    reward: checkSetting.value.reward,
                    reward_asset: checkSetting.value.reward_asset,
                    is_referral: type == 'referral reward-kyc' ? true : false,
                    created_date: moment().format('YYYY-MM-DD HH:mm:ss')
                });
                await new rewardHistory(addRewardHistory).save();

                let serviceData = Object.assign({}, {
                    "subject": ` ${checkSetting.value.reward_asset} - Deposit Confirmation`,
                    "email_for": "deposit-notification",
                    "amt": checkSetting.value.reward,
                    "coin": checkSetting.value.reward_asset,
                    "user_id": userId

                });
                await apiServices.sendEmailNotification(serviceData, res);
                return checkSetting.value.reward;
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

    async kycDetails(req, res) {
        let data = req.body.data.attributes;
        data.user = req.user.user;
        let checkUser = await users.findOne({ _id: data.user })
        if (!checkUser) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'User cannot be found.'
            }, 'user', 400));
        }

        if (data.otp == null || undefined) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Please enter the OTP.'
            }, 'user', 400));
        }
        let checkOtp = await this.validateOtpForEmail(req, res, "kyc details");
        if (checkOtp.status == false) {
            return res.status(400).send(this.errorMsgFormat({
                'message': checkOtp.err
            }, 'user', 400));
        }

        // let response = await this.kycSession(req, res, 'details');
        // if (response.status) {
        //     sessionResponse = response.result.parsedResponse;
        //     data.session_id = sessionResponse.session_id;
        //     data.client_session_token = sessionResponse.client_session_token;
        //     checkUser.kyc_statistics = 'PENDING';
        //     checkUser.save();
        // let check = await kycDetails.findOne({ user: data.user })

        // if (check) {
        //     check.session_id = sessionResponse.session_id,
        //         check.client_session_token = sessionResponse.client_session_token;
        //     check.save();
        // } else {
        await new kycDetails(data).save();
        // }
        // let getData = {
        //     session_id: sessionResponse.session_id,
        //     client_session_token: sessionResponse.client_session_token
        // }

        await users.findOneAndUpdate({ _id: data.user }, { kyc_statistics: "PENDING" });
        await apiServices.publishNotification(req.user.user_id, { 'kyc_statistics': 'PENDING', 'logout': false });
        return res.status(200).send(this.successFormat("Kyc details submitted Successfully", null, 'user', 200))
        // }
        // else {
        //     return res.status(400).send(this.errorMsgFormat({
        //         'message': response.error
        //     }, 'user', 400));
        // }

    }

    async kycStatistics(req, res) {
        let checkUser = await users.findOne({ _id: req.user.user });
        if (checkUser) {
            return res.status(200).send(this.successFormat({
                'kyc_statistics': checkUser.kyc_statistics
            }, null, 'user', 200));
        }
        else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'User cannot be found'
            }, 'user', 400));
        }
    }

    async removeUnderScore(str) {
        let removeUnderScore = str.replace(/_/g, " ").toLowerCase();
        return removeUnderScore;
    }

    async checkApikey(req, res) {
        req.body.data['id'] = req.user.user;
        let requestData = req.body.data.attributes;
        if (!requestData.g2f_code) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Google authentication code must be provided.'
            }, 'user', 400));
        }
        let check = await this.postVerifyG2F(req, res, 'boolean');
        if (check.status == false) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'The google authentication code you entered is incorrect.'
            }, '2factor', 400));
        }
        switch (requestData.type) {
            case 'remove':
                let checkApiKeyRemove = await apikey.findOne({ user: req.body.data.id, is_deleted: false });
                if (!checkApiKeyRemove) {
                    return res.status(400).send(this.errorMsgFormat({ message: 'API key cannot be found.Please create you Passphrase key.' }, 'user', 400));
                }
                await apikey.findOneAndUpdate({ _id: checkApiKeyRemove.id }, { is_deleted: true, modified_date: moment().format('YYYY-MM-DD HH:mm:ss') });
                await users.findOneAndUpdate({ _id: req.user.user }, { api_key: null });
                await apiServices.publishNotification(req.user.user_id, { 'apiKey': null, 'logout': false });
                return res.status(200).send(this.successFormat({ message: 'API key deleted.' }, 'user', 200));

            case 'create':
                let checkUser = await apikey.findOne({ user: req.body.data.id, is_deleted: false });
                if (checkUser) {
                    return res.status(400).send(this.errorMsgFormat({ message: 'A API key is already available for this account.' }, 'user', 400));
                }
                const apiKey = await helpers.generateUuid();
                let uuidSplit = apiKey.split('-');
                const apiSecret = await helpers.createSecret(`${uuidSplit[0]}-${uuidSplit[uuidSplit.length - 1]}`, requestData.passphrase);
                await users.findOneAndUpdate({ _id: req.user.user }, { api_key: uuidSplit[0] });
                let addApiKey = Object.assign({}, {
                    user: req.user.user,
                    user_id: req.user.user_id,
                    apikey: apiKey,
                    secretkey: apiSecret,
                    type: requestData.type
                });
                await new apikey(addApiKey).save();
                await apiServices.publishNotification(req.user.user_id, { 'apiKey': apiKey, 'logout': false });
                return res.status(200).send(this.successFormat({ 'apiKey': apiKey, 'secretKey': apiSecret, message: 'Your API key was created successfully.', }, 'user', 200));

            case 'view':
                let validateApiKey = await apikey.findOne({ user: req.body.data.id, is_deleted: false });
                if (!validateApiKey) {
                    return res.status(400).send(this.errorMsgFormat({ message: 'API key cannot be found.Please create you API key.' }, 'user', 400));
                }
                let creatUuidSplit = validateApiKey.apikey.split('-');
                const apiSecretValidate = await helpers.createSecret(`${creatUuidSplit[0]}-${creatUuidSplit[creatUuidSplit.length - 1]}`, requestData.passphrase);
                if (validateApiKey.secretkey === apiSecretValidate) {
                    return res.status(200).send(this.successFormat({ 'apiKey': validateApiKey.apikey, 'secretKey': validateApiKey.secretkey, message: 'Your API key was successfully validated.' }, 'user', 200));
                } else {
                    return res.status(400).send(this.errorMsgFormat({ message: 'The API key you entered is incorrect.' }, 'user', 400));
                }
        }
    }

    async listCurrencies(req, res) {
        let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        console.log('IP detect', ip)
        let currencyList = await changeCurrency.find({});
        let currency = [], i = 0;
        while (i < currencyList.length) {
            let listAllCurrency = Object.assign({}, {
                code: currencyList[i].code, currencyName: currencyList[i].currency_name
            });
            currency.push(listAllCurrency);
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
        await users.findOneAndUpdate({ _id: req.user.user }, { currency_code: currency.code });
        await apiServices.publishNotification(req.user.user_id, { 'currency_code': currency.code, 'logout': false });
        return res.status(200).send(this.successFormat({
            'currencyPrice': price
        }, 'currecy'));
    }

    async rewardUserBalance(req, res) {
        let checkBalance = await rewardBalance.findOne({ user: req.user.user, is_deleted: false }).select('reward reward_asset created_date');
        if (checkBalance) {
            return res.status(200).send(this.successFormat([checkBalance.reward, checkBalance.reward_asset, checkBalance.created_date]));
        }
        return res.status(200).send(this.successFormat([]));
    }

    async moveReward(req, res) {
        let sum = 0;
        let data = req.body.data.attributes;
        let rewards = await rewardBalance.findOne({ user: req.user.user, reward: data.amount, reward_asset: data.asset, is_deleted: false })
        if (rewards) {
            //let i = 0, j = 0;
            let checkUser = await users.findOne({ _id: req.user.user, kyc_verified: true });

            // if (checkUser.google_auth) {
            //     if (!data.g2f_code) {
            //         return res.status(400).send(this.errorMsgFormat({
            //             'message': 'Google authentication code must be provided.'
            //         }, 'user', 400));
            //     }
            //     let check = await this.postVerifyG2F(req, res, 'boolean');
            //     if (check.status == false) {
            //         return res.status(400).send(this.errorMsgFormat({
            //             'message': 'The google authentication code you entered is incorrect.'
            //         }, '2factor', 400));
            //     }

            // }
            // else {
            if (data.otp == null || undefined) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'OTP must be provided.'
                }, 'user', 400));
            }
            req.body.data['id'] = req.user.user;
            let checkOtp = await this.validateOtpForEmail(req, res, "move balance");
            if (checkOtp.status == false) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': checkOtp.err
                }, 'user', 400));
            }
            // }
            // let userTrade = await trade.findOne({ user: req.user.user, type: 'totalUserAddedTrades' });
            // if (!userTrade) {
            //     return res.status(400).send(this.errorMsgFormat({
            //         message: 'You should have trade volume of 1 BTC to move the rewards to wallet balance'
            //     }));
            // } else {
            //     while (i < userTrade.sell.length) {
            //         if (Object.keys(userTrade.sell[i]) == "sixMonth") {
            //             sum += userTrade.sell[i].sixMonth.amount.btc
            //         }
            //         i++;
            //     }
            //     while (j < userTrade.buy.length) {
            //         if (Object.keys(userTrade.buy[j]) == "sixMonth") {
            //             sum += userTrade.buy[j].sixMonth.amount.btc
            //         }
            //         j++;
            //     }
            if (checkUser) {
                let payloads = Object.assign({}, {
                    "user_id": checkUser.user_id,
                    "asset": rewards.reward_asset,
                    "business": "deposit",
                    "business_id": new Date().valueOf(),
                    "change": rewards.reward + '',
                    "detial": {}
                });
                await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');
                await rewardBalance.findOneAndUpdate({ user: req.user.user, reward: rewards.reward, reward_asset: data.asset }, { is_deleted: true })
                await apiServices.publishNotification(checkUser.user_id, { 'move_reward_balance': true, 'asset': rewards.reward_asset, 'reward': rewards.reward + '', 'logout': false });
                return res.status(200).send(this.successFormat({
                    'message': `Your ${rewards.reward_asset} rewards has been moved to wallet balance`
                }, 'reward'));
            }
            else {
                return res.status(400).send(this.errorMsgFormat({
                    message: 'You should verifiy your kyc '
                }));
            }

            //}
        }
        else {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Not enough reward balance for the given asset'
            }));
        }
    }


    async tradeBalance(req, res) {
        let userTrade = await trade.findOne({ user: req.user.user, type: 'totalUserAddedTrades' });

        let i = 0, j = 0, sum = 0;
        if (userTrade) {
            while (i < userTrade.sell.length) {
                if (Object.keys(userTrade.sell[i]) == "sixMonth") {
                    sum += userTrade.sell[i].sixMonth.amount.btc
                }
                i++;
            }
            while (j < userTrade.buy.length) {
                if (Object.keys(userTrade.buy[j]) == "sixMonth") {
                    sum += userTrade.buy[j].sixMonth.amount.btc
                }
                j++;
            }
            return res.status(200).send(this.successFormat({ total: sum }));
        }

        return res.status(200).send(this.successFormat({ total: 0 }));
    }

    async kycVerified(req, res) {
        let data = req.query.code;
        let user = await users.findOne({ _id: req.user.user })
        if (!data) {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Kyc code must be provide.'
            }));
        }
        let checkAuth = await apiServices.getAccessCode(data, res);
        if (!checkAuth) {
            return res.status(400).send(this.errorMsgFormat({
                message: 'The request failed for the given kyc code'
            }));
        }
        await kycDetails.findOneAndUpdate({ user: req.user.user }, { code: checkAuth.access_token });
        let checkUserMe = await apiServices.checkUserMe(checkAuth.access_token);
        if (!checkUserMe) {
            return res.status(400).send(this.errorMsgFormat({
                message: 'Unauthorized'
            }));
        }
        if (user.email.toLowerCase() != checkUserMe.emails[0].address.toLowerCase()) {
            await users.findOneAndUpdate({ _id: req.user.user }, { kyc_statistics: "REJECT" });
            await apiServices.publishNotification(checkUser.user_id, { 'kyc_statistics': 'REJECT', logout: false });
            return res.status(400).send(this.errorMsgFormat({
                message: 'KYC verification failed since the email address you provided did not match your Beldex registered email address'
            }));
        }
        if (Object.keys(checkUserMe.person).length > 0) {
            let name = checkUserMe.person.full_name.replace(/ /g, '').toLowerCase()
            let checkKycDetails = await kycDetails.findOne({ country: checkUserMe.person.identification_document_country, date_of_birth: checkUserMe.date_of_birth, fractal_username: name, user: { $ne: req.user.user } })
            if (checkKycDetails) {
                let serviceData = Object.assign({}, {
                    "subject": `Your KYC verification could not be processed.`,
                    "email_for": "kyc-verificationfail",
                    "user_id": user._id,
                    "to_email": user.email
                });
                await apiServices.sendEmailNotification(serviceData, res);
                await users.findOneAndUpdate({ _id: req.user.user }, { kyc_statistics: "REJECT" });
                await apiServices.publishNotification(checkUser.user_id, { 'kyc_statistics': 'REJECT', logout: false });
                return res.status(400).send(this.errorMsgFormat({
                    message: 'Your KYC verification has been failed due to duplicate KYC entry, please check your email for more details.'
                }));
            }
            await kycDetails.findOneAndUpdate({ user: req.user.user }, { uid: checkUserMe.uid, country: checkUserMe.person.identification_document_country, type_of_documentation: checkUserMe.person.identification_document_type, documentation_id: checkUserMe.person.identification_document_number, date_of_birth: checkUserMe.date_of_birth, fractal_username: name })
            if (checkUserMe.verifications.length == 0) {
                return res.status(200).send(this.successFormat({ "message": "Your documents were successfully uploaded and are under processing, You will receive an email notification regarding status of kyc" }));
            }
        }
        else {
            await kycDetails.findOneAndUpdate({ user: req.user.user }, { uid: checkUserMe.uid })
            return res.status(200).send(this.successFormat({ "message": "Your documents were successfully uploaded and are under processing, You will receive an email notification regarding status of kyc" }));
        }
        await users.findOneAndUpdate({ _id: req.user.user }, { kyc_verified: true, kyc_statistics: "APPROVE", kyc_verified_date: new Date() })
        await users.findOneAndUpdate({ _id: req.user.user }, { kyc_statistics: "APPROVE" });
        return res.status(200).send(this.successFormat({ "message": "The KYC documents you uploaded were received and successfully verified. " }));
    }

    async showMovedBalance(req, res) {
        let checkRewarBalance = await rewardBalance.findOne({ user: req.user.user, is_deleted: true }, { '_id': 0 }).select('reward modified_date reward_asset')
        if (checkRewarBalance) {
            return res.status(200).send(this.successFormat({ data: checkRewarBalance }));
        }
        return res.status(200).send(this.successFormat({ data: null }));
    }


    async script(req, res) {
        let i = 0;
        let user = await balance.find().populate({
            path: 'user',
            select: ('user_id')
        });
        let self = this;
        function interval() {
            let k = 0;
            let userBalanace = user[i].balance;
            while (k < userBalanace.length) {
                let amount = 0;
                if (Number(userBalanace[k].freeze) != 0) {
                    amount = Number(userBalanace[k].available) + Number(userBalanace[k].freeze);
                } else {
                    amount = Number(userBalanace[k].available)
                }
                if (amount > 0) {
                    let payloads = Object.assign({}, {
                        "user_id": user[i].user_id,
                        "asset": userBalanace[k].asset_code,
                        "business": "deposit",
                        "business_id": new Date().valueOf(),
                        "change": amount.toString(),
                        "detial": {}
                    });
                    apiServices.matchingEngineRequest('patch', 'balance/update', self.requestDataFormat(payloads), res, 'data');

                }
                k++;
            }
            i++;
            console.log("I:", i);

            if (i == user.length - 1) {
                console.log('in clear interval')
                clearInterval(this);
            }
        };

        setInterval(interval, 10);

        return res.send('Success').status(200);
    }

    async getToken(req, res) {
        try {

            let api_key = req.body[0]

            let user = await apikey.findOne({ 'apikey': api_key }).select('user');

            if (user) {
                let token_data = await managementToken.findOne({ 'user': user.user }).sort({ '_id': -1 });

                let token;

                if (!_.isEmpty(token_data.access_token)) {
                    token = token_data.access_token
                }

                res.status(200).send({
                    status: true,
                    token
                })

            } else {
                res.status(400).send(this.errorMsgFormat({
                    message: 'api key not found..!'
                }));
            }

        } catch (err) {

        }
    }

    async withdrawDiscount(req, res) {
        let checkUser = await withdrawDiscount.find({ user: req.user.user });
        if (checkUser.length > 0) {
            return res.status(200).send(this.successFormat({ data: checkUser }));
        }
        return res.status(200).send(this.successFormat({ data: [] }));
    }

    async disableToken(req, res) {
        try {
            let user_id = req.query.user_id;
            let data = await users.findOne({ user_id });
            await managementToken.updateMany({ "user": data._id, "type_for": "token", "is_deleted": false }, { "is_deleted": true });
            return res.status(200).send(this.successFormat({ data: 'Token disabled successfully' }));
        } catch (error) {
            res.status(400).send(this.errorMsgFormat({ message: error.message }));
        }
    }

    async getUserInfo(req, res) {
        try {
            let user = req.query.user_id;
            let result = await users.findOne({ "user_id": user });
            let tokens = await managementToken.findOne({ "user": result._id, "type_for": "token" }).sort({ "_id": -1 });
            let info = await managementToken.findOne({ "user": result._id, "type_for": "info-token" }).sort({ "_id": -1 });

            let response = Object.assign({}, {
                "apiKey": result.api_key,
                "info": info.infoToken,
                "token": tokens.accessToken,
                "g2fEnabled": result.google_auth,
                "sms_auth": result.sms_auth,
                "anti_spoofing": result.anti_spoofing,
                "anti_spoofing_code": result.anti_spoofing ? result.anti_spoofing_code : null,
                'white_list_address': result.white_list_address,
                "withdraw": result.withdraw,
                "taker_fee": Number(result.taker_fee) * 100,
                "maker_fee": Number(result.maker_fee) * 100,
                "kyc_verified": result.kyc_verified,
                "trade": result.trade,
                "referral_code": result.referral_code,
                "currency_code": result.currency_code
            });

            return res.status(200).send({ data: response });

        } catch (error) {
            res.status(400).send(this.errorMsgFormat({ message: error.message }));
        }
    }
    async votingCoinList(req, res) {
        try {
            let currentPhase = await votingPhase.findOne({ is_active: true }).sort({ _id: -1 });
            if (!currentPhase) {
                return res.status(200).send(this.successFormat({ message: 'No voting phase available.' }));
            }
            let checkUserVote = await votingUserList.findOne({ user: req.user.user, phase_id: currentPhase._id }).populate('coin_id');
            let coinList = await votingCoinList.find({ phase_id: currentPhase._id });
            return res.status(200).send(this.successFormat({ currentPhase, userVote: (checkUserVote) ? true : false, coin_code:checkUserVote ? checkUserVote.coin_id.coin_code : null , result: coinList }));
        }
        catch (error) {
            res.status(400).send(this.errorMsgFormat({ message: error.message }));
        }
    }

    async userVote(req, res) {
        try {
            let data = req.body.data.attributes;
            let checkUser = await users.findOne({ _id: req.user.user });
            if (!checkUser) {
                return res.status(400).send(this.errorMsgFormat({ message: 'user not found.' }));
            }
            if (!checkUser.kyc_verified) {
                return res.status(400).send(this.errorMsgFormat({ message: 'You must verify your kyc to participate in voting.' }));
            }
            let checkPhase = await votingPhase.findOne({ _id: data.phase_id });
            if (!checkPhase) {
                return res.status(400).send(this.errorMsgFormat({ message: 'phase not found.' }));
            }
            let checkCoinListing = await votingCoinList.findOne({ phase_id: data.phase_id, _id: data.coin_id });
            if (!checkCoinListing) {
                return res.status(400).send(this.errorMsgFormat({ message: 'This coin not list.' }));
            }
            let checkUserVoting = await votingUserList.findOne({ user: req.user.user, phase_id: data.phase_id });
            if (checkUserVoting) {
                return res.status(400).send(this.errorMsgFormat({ message: 'This user already voted.' }));
            }
            data.user = req.user.user;
            await new votingUserList(data).save();
            let votedCoin = await votingCoinList.findOneAndUpdate({ _id: data.coin_id }, {
                $inc: {
                    number_of_vote: 1
                }
            });
            res.status(200).send(this.successFormat({ message: "successfully voted.", voteCount: votedCoin.number_of_vote + 1, coin_code: votedCoin.coin_code }));
        }
        catch (error) {
            res.status(400).send(this.errorMsgFormat({ message: error.message }));
        }
    }

    async getPanetPosters(req, res) {
        if (req.query.mobile=='true') {
            let bannerList = await banner.find({ is_mobile: true, is_active: true });
            return res.status(200).send(this.successFormat({ result: bannerList }));
        }
        if (req.query.desktop=='true') {
            let bannerList = await banner.find({ is_mobile: false, is_active: true });
            return res.status(200).send(this.successFormat({ result: bannerList }));
        }
        return res.status(400).send(this.errorMsgFormat({ message: "Your request was wrong." }));
    }

    async getUserTradeVolume(req, res) {
        let user_id = req.user.user_id;
        let lastThirtyDay = new Date(moment().subtract(30, 'days'));
        let today = new Date();
        let data = await tradeVolume.find({ user_id, created_date: { $gte: new Date(lastThirtyDay), $lte: today } });
        let i = 0, totalVolume = 0;
        while (i < data.length) {
            totalVolume += data[i].btc_volume;
            i++;
        };
        res.status(200).send(this.successFormat({ result: totalVolume }))
    }

}


module.exports = new User;
