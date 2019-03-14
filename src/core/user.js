const moment           = require('moment');
const users            = require('../db/users');
const deviceMangement  = require('../db/device-management');
const loginHistory     = require('../db/login-history');
const userTemp         = require('../db/user-temp');
const helpers          = require('../helpers/helper.functions');
const config           = require('config');
const jwt              = require('jsonwebtoken');
const Joi              = require('joi');
const bcrypt           = require('bcrypt');
const Controller       = require('../core/controller');

class User extends Controller {

    activate (req, res) {
        const userHash = JSON.parse(helpers.decrypt(req.params.hash));
        if (userHash.id) {
            userTemp.findById(userHash.id)
            .exec((err, result) => {
                if (result) {
                    this.insertUser(result, res)
                } else {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid token. may be token as expired!'
                    }));
                }
            });
        } else {
            return res.status(500).send(this.errorMsgFormat({
                'message': 'invalid token.'
            }));
        }
    }

    insertUser (result, res) {
        users.create({
            email: result.email,
            password: result.password,
            referral_code: result.referral_code,
            created_date: result.created_date
        }, (err) => {
            if (err) {
                return res.status(500).send(this.errorMsgFormat(err))
            } else {
                if (userTemp.removeUserTemp(result.id)) {
                    return res.status(200).send(this.successFormat({
                        'message': `Congratulation!, Your account has been activated.`
                    }));
                } else {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid token. may be token as expired!'
                    }));
                }
            }
        });
    }

    createToken (user) {
        let jwtOptions = {
            issuer: config.get('secrete.issuer'),
            subject: 'Authentication',
            audience: config.get('secrete.domain'),
            expiresIn: config.get('secrete.expiry'),
        };

        return jwt.sign({
            user: user._id,
            user_id: user.user_id,
        }, config.get('secrete.key'), jwtOptions);
    };

    login (req, res) {
        users.findOne({ email: req.body.data.attributes.email })
        .exec()
        .then((result) => {
            if (!result) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid credentials'
                }));
            }

            let passwordCompare = bcrypt.compareSync(req.body.data.attributes.password, result.password);
            if (passwordCompare == false) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Invalid credentials'
                }));
            } else {

                // check that device is already exists or not
                this.checkDevice(req, res, result);
            }
        });
    }
    
    validate (req) {
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

        return Joi.validate(req, schema, { abortEarly: false });
    }

    async removeUser  (email, res) {
        await users.deleteOne({ email: email })
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

    getTokenToUserId (req, res, data = 'json') {
        let token = req.headers.authorization;
        try {

            let decoded  = jwt.verify(token, config.get('secrete.key'));
            if (data === 'json') {
                return res.status(200).json({ "code": 0, "message": 'Authorization successfully.', "data": { "user_id": decoded.user_id }});
            } else {
                return decoded.user;
            }
        } catch(err) {
            return res.status(401).json(this.errorMsgFormat({
                        message: "Invalid authentication"
                    }, 'user', 401));
        }
    }

    checkDevice (req, res, user) {
        var userID = user._id;

        // Find some documents
        deviceMangement.countDocuments({ user: userID }, async (err, count) => {
            if(!count) {
                // insert new device records
                await this.insertDevice(req, userID, true).then(async (device) => {
                    // insert login history
                    await this.insertLoginHistory(req, userID, device._id);
                });
                
                return res.status(200).send(this.successFormat({
                    "token": this.createToken(user),
                    "created_at": Date.now()
                }, user._id));
            } else {
                deviceMangement.findOne({ user: userID, ip: req.body.data.attributes.ip, verified: true })
                .exec()
                .then(async (result) => {
                    if (!result) {
                        // insert new device records
                        await this.insertDevice(req, userID).then(() => { });
                        let urlHash = this.encryptHash({ "user_id": userID, "ip": req.body.data.attributes.ip, "verified": true });
                        return res.status(401).send(this.errorMsgFormat({ 'msg' : 'unauthorized', 'hash': urlHash }, 'users', 401));
                    } else {
                        // insert new device records
                        await this.insertDevice(req, userID, true).then(async (device) => {
                            // insert login history
                            await this.insertLoginHistory(req, userID, device._id);
                        });
                        
                        return res.status(200).send(this.successFormat({
                            "token": this.createToken(user),
                            "created_at": Date.now()
                        }, user._id));
                    }
                    });
            }
        });
    }

    insertDevice (req, userID, verify = false, cb) {
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

        return new deviceMangement(data).save(cb);
    }

    insertLoginHistory ( req, userID, deviceID ) {
        loginHistory.create({
            user: userID,
            device: deviceID,
            auth_type: req.body.data.attributes.auth_type ? req.body.data.attributes.auth_type : 1
        }, (err) => {
            if (err) {
                return res.status(500).json(this.errorMsgFormat({ 'message': err.message }));
            }
        });

        return true;
    }

    getLoginHistory (req, res) {
        let pageNo  = parseInt(req.query.page_no)
        let size    = parseInt(req.query.size)
        let query   = {}
        if(pageNo < 0 || pageNo === 0) {
            return res.status(404).json(this.errorMsgFormat({"message" : "invalid page number, should start with 1"}))
        }

        query.skip  = size * (pageNo - 1)
        query.limit = size

        let userID = this.getTokenToUserId(req, res, 'ID');

        // Find some documents
        loginHistory.countDocuments({ user: userID }, (err, totalCount) => {
            if(err) {
                return res.status(404).json(this.errorMsgFormat({"message" : "No data found"}, 'loginHistory', 404))
            } else {
                loginHistory
                .find({ user: userID })
                .select('-__v -_id')
                .skip(query.skip)
                .limit(query.limit)
                .populate({ path: 'device', select: '-_id -user -created_date -__v'})
                .exec()
                .then((data) => {
                    if(!data.length) {
                        return res.status(404).json(this.errorMsgFormat({"message" : "No data found"}, 'loginHistory', 404));
                    } else {
                        var totalPages = Math.ceil(totalCount / size);
                        return res.status(200).json(this.successFormat({"data" : data, "pages": totalPages, "totalCount": totalCount}, userID, 'loginHistory', 200));
                    }
                });
            }
        });
    }

    getDeviceHistory (req, res) {
        let pageNo  = parseInt(req.query.page_no)
        let size    = parseInt(req.query.size)
        let query   = {}
        if(pageNo < 0 || pageNo === 0) {
            return res.status(404).json(this.errorMsgFormat({"message" : "invalid page number, should start with 1"}))
        }

        query.skip  = size * (pageNo - 1)
        query.limit = size

        let userID = this.getTokenToUserId(req, res, 'ID');

        // Find some documents
        deviceMangement.countDocuments({ user: userID }, (err, totalCount) => {
            if(err) {
                return res.status(404).json(this.errorMsgFormat({"message" : "No data found"}, 'device', 404))
            } else {
                deviceMangement.find({ user: userID }, '-_id -__v -user', query, (err, data) => {
                    if(err || !data.length) {
                        return res.status(404).json(this.errorMsgFormat({"message" : "No data found"}, 'device', 404));
                    } else {
                        var totalPages = Math.ceil(totalCount / size);
                        return res.status(200).json(this.successFormat({"data" : data, "pages": totalPages, "totalCount": totalCount}, userID, 'devices', 200));
                    }
                });
            }
        });
    }

    encryptHash (jsonData) {
        let timeNow     = moment().format('YYYY-MM-DD HH:mm:ss');
        let data     = JSON.stringify({
            'data': jsonData,
            'datetime' : timeNow
        });

        return helpers.encrypt(data);
    }

    checkTimeExpired ( startDate ) {
        let duration    = moment.duration(moment().diff(startDate));

        // check expiry time in seconds
        if (config.get('settings.expiryTime') > duration.asSeconds()) {
            return true;
        }

        return false;
    }

    patchWhiteListIP (req, res) {
        let deviceHash = JSON.parse(helpers.decrypt(req.params.hash));
        if ( deviceHash.data.user_id ) {
            let checkExpired = this.checkTimeExpired(deviceHash.data.datetime);
            if ( checkExpired ) {
                deviceMangement.findOne({ ip: deviceHash.data.ip, user: deviceHash.data.user_id })
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
                'message': 'invalid token or token is expired.'
            }));
        }
    }

    updateWhiteListIP (hash, res) {

          // find and update the reccord
          deviceMangement.updateMany({ 'ip': hash.data.ip , 'user': hash.data.user_id }, { verified: hash.data.verified }, (err, device) => {
            if (err) {
                return res.status(404).send(this.errorMsgFormat({'message': 'Invalid device.' }));
            } else {
                console.log(device)
                return res.status(202).send(this.successFormat({
                    'message': 'Your IP address whitelisted Now you can able to login..'
                }, device.user, 'users', 202));
            }
        });
    }
    
}

module.exports = new User;