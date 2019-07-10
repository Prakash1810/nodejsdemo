const moment = require('moment');
const controller = require('../core/controller');
const assets = require('../db/assets');
const userAddress = require('../db/user-address');
const withdrawAddress = require('../db/withdrawal-addresses');
const Joi = require('joi');
const users = require('../db/users');
const coinAddressValidator = require('wallet-address-validator');
const apiServices = require('../services/api');
const config = require('config');
const _ = require('lodash');
const transactions = require('../db/transactions');
const beldexNotification = require('../db/beldex-notifications');
const mongoose = require('mongoose');
// const Fawn = require("fawn");

// Fawn.init(`mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_NAME}`);

class Wallet extends controller {

    getAssets(req, res) {
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

        // Find some documents
        assets.countDocuments({
            is_suspend: false
        }, (err, totalCount) => {
            if (err) {
                return res.status(200).json(this.successFormat({
                    "data": [],
                    "pages": 0,
                    "totalCount": 0
                }, null, 'assets', 200));
            } else {
                assets.find({
                    is_suspend: false
                }, '_id asset_name asset_code logo_url', query, (err, data) => {
                    if (err || !data.length) {
                        return res.status(200).json(this.successFormat({
                            "data": [],
                            "pages": 0,
                            "totalCount": 0
                        }, null, 'assets', 200));
                    } else {
                        var totalPages = Math.ceil(totalCount / size);
                        return res.status(200).json(this.successFormat({
                            "data": data,
                            "pages": totalPages,
                            "totalCount": totalCount
                        }, null, 'assets', 200));
                    }
                });
            }
        });
    }

    async getAssetAddress(req, res) {
        let asset = req.body.data.attributes.asset;
        if (asset !== undefined && asset !== '' && asset !== null) {
            let getAddress = await userAddress.findOne({
                asset: asset,
                user: req.user.user
            });
            if (!getAddress) {
                let isChecked =  await assets.findOne({_id:asset})
                let data =
                {
                    coin : isChecked.asset_code,
                    user_id: req.user.user_id,
                    user: req.user.user,
                    asset: asset
                }
                
                apiServices.axiosAPI(data);
            } else {
                return res.status(200).json(this.successFormat({
                    'asset_code': getAddress.asset_code,
                    'address': getAddress.address
                }, asset, 'address'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "Invalid request"
            }, 'assets', 400));
        }
    }

    postWithdrawAddressValidation(req) {
        let schema = Joi.object().keys({
            asset: Joi.string().required(),
            address: Joi.string().required(),
            label: Joi.string().required(),
            is_whitelist: Joi.boolean().optional()
        });

        return Joi.validate(req, schema, {
            abortEarly: false,
            language: {
                escapeHtml: true
            }
        });
    }

    async coinAddressValidate(address, asset) {
        let getAsset = await assets.findById(asset);
        if (getAsset) {
            let asset_code = getAsset.asset_code;

            // check if bdx
            if (asset_code.toLowerCase() === 'bdx') return true;

            return coinAddressValidator.validate(address, asset_code.toLowerCase());
        } else {
            return false;
        }
    }

    async postWithdrawAddress(req, res) {
        let requestData = req.body.data.attributes;

        // check addres is valid or not
        let isValid = await this.coinAddressValidate(requestData.address, requestData.asset);
        if (isValid !== true) {
            return res.status(400).send(this.errorMsgFormat({
                'address': 'Invalid address.'
            }, 'withdrawAddress'));
        }

        // check address already exists
        let checkAddress = await withdrawAddress.findOne({
            'address': requestData.address,
            'user': req.user.user,
            'is_deleted': false
        });

        if (checkAddress) {
            return res.status(400).send(this.errorMsgFormat({
                'address': 'This address already exits.'
            }, 'withdrawAddress'));
        } else {
            withdrawAddress.create({
                user: req.user.user,
                asset: requestData.asset,
                label: requestData.label,
                address: requestData.address,
                is_whitelist: (requestData.is_whitelist !== undefined) ? requestData.is_whitelist : false
            }, (err, address) => {
                if (err) {
                    return res.status(500).json(this.errorMsgFormat({
                        'message': err.message
                    }, 'withdrawAddress', 500));
                } else {
                    return res.status(200).json(this.successFormat({
                        'message': 'Address added successfully.',
                    }, address._id));
                }
            });
        }
    }

    async patchWithdrawAddress(req, res) {
        let requestData = req.body.data.attributes;
        if (req.body.data.id !== undefined && requestData.is_whitelist !== undefined) {

            // find and update the reccord
            await withdrawAddress.findOneAndUpdate({
                    _id: req.body.data.id
                }, {
                    $set: {
                        is_whitelist: requestData.is_whitelist
                    }
                })
                .then(result => {
                    return res.status(202).send(this.successFormat({
                        'message': 'Your request is updated successfully.'
                    }, result._id, 'withdrawAddress', 202));
                })
                .catch(err => {
                    return res.status(500).send(this.errorMsgFormat({
                        'message': err.message
                    }, 'withdrawAddress', 500));
                });
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request.'
            }, 'withdrawAddress', 400));
        }
    }

    async deleteWithdrawAddress(req, res) {
        let ID = req.params.id;
        if (ID !== undefined) {

            // find and update the reccord
            await withdrawAddress.findOneAndUpdate({
                    _id: ID
                }, {
                    $set: {
                        is_deleted: true
                    }
                })
                .then(result => {
                    return res.status(202).send(this.successFormat({
                        'message': 'Your requested record deletedd successfully.'
                    }, result._id, 'withdrawAddress', 202));
                })
                .catch(err => {
                    return res.status(500).send(this.errorMsgFormat({
                        'message': err.message
                    }, 'withdrawAddress', 500));
                });
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request.'
            }, 'withdrawAddress', 400));
        }
    }

    getWithdrawAddress(req, res) {
        let pageNo = parseInt(req.query.page_no)
        let size = parseInt(req.query.size)
        let query = {}

        let payloads = {
            is_deleted: false,
            user: req.user.user
        };

        if (pageNo < 0 || pageNo === 0) {
            return res.status(400).json(this.errorMsgFormat({
                "message": "invalid page number, should start with 1"
            }))
        }

        query.skip = size * (pageNo - 1)
        query.limit = size

        // Find some documents
        withdrawAddress.countDocuments(payloads, (err, totalCount) => {
            if (err) {
                return res.status(200).json(this.successFormat({
                    "data": [],
                    "pages": 0,
                    "totalCount": 0
                }, null, 'withdrawAddress', 200));
            } else {
                withdrawAddress
                    .find(payloads)
                    .select('_id  address label is_whitelist')
                    .skip(query.skip)
                    .limit(query.limit)
                    .populate({
                        path: 'asset',
                        select: 'asset_name asset_code logo_url -_id'
                    })
                    .exec()
                    .then((data) => {
                        if (!data.length) {
                            return res.status(200).json(this.successFormat({
                                "data": [],
                                "pages": 0,
                                "totalCount": 0
                            }, null, 'withdrawAddress', 200));
                        } else {
                            var totalPages = Math.ceil(totalCount / size);
                            return res.status(200).json(this.successFormat({
                                "data": data,
                                "pages": totalPages,
                                "totalCount": totalCount
                            }, null, 'withdrawAddress', 200));
                        }
                    });
            }
        });
    }

    async getAssetWithdrawAddress(req, res) {

        // fetch user whitelist setting
        let isWhitelist = await users.findById(req.user.user).white_list_address;

        // Find asset baseds withdraw address
        let data = await withdrawAddress
            .find({
                is_deleted: false,
                user: req.user.user,
                asset: req.params.asset,
                is_whitelist: (isWhitelist !== undefined) ? isWhitelist : false
            }, )
            .select('-_id  address label is_whitelist');

        if (!data) {
            return res.status(200).json(this.successFormat({
                "data": {
                    'asset': req.params.asset,
                    'address': []
                }
            }, null, 'withdrawAddress', 200));
        } else {
            let assetAddress = [];
            data.forEach((withdraw) => {
                assetAddress.push(withdraw.address);
            });

            return res.status(200).json(this.successFormat({
                "data": {
                    'asset': req.params.asset,
                    'address': assetAddress
                }
            }, null, 'withdrawAddress', 200));
        }
    }

    async getAssetsBalance(req, res) {
        let payloads = {},
            assetNames;
        payloads.user_id = req.user.user_id;
        if (req.query.asset_code !== undefined) {
            payloads.asset = req.query.asset_code.toUpperCase();
            assetNames = config.get(`assets.${req.query.asset_code.toLowerCase()}`)
        } else {
            assetNames = _.values(_.reverse(config.get(`assets`))).join(',');
        }

        let apiResponse = await apiServices.matchingEngineRequest('post', 'balance/query', this.requestDataFormat(payloads), res, 'data');
        let marketResponse = await apiServices.marketPrice(assetNames);
        let formatedResponse = this.currencyConversion(apiResponse.data.attributes, marketResponse);

        return res.status(200).json(this.successFormat({
            "data": formatedResponse
        }, null, 'asset-balance', 200));
    }

    currencyConversion(matchResponse, marketResponse) {
        let assetsJson = config.get('assets'),
            formatedAssetBalnce = {};

        for (let result in matchResponse) {
            let btc = marketResponse.data[assetsJson[result.toLowerCase()]].btc;
            let usd = marketResponse.data[assetsJson[result.toLowerCase()]].usd;

            formatedAssetBalnce[result] = {
                'available': {
                    'balance': Number(matchResponse[result].available),
                    'btc': matchResponse[result].available * btc,
                    'usd': matchResponse[result].available * usd
                },
                'freeze': {
                    'balance': Number(matchResponse[result].freeze),
                    'btc': matchResponse[result].freeze * btc,
                    'usd': matchResponse[result].freeze * usd
                },
            }
        }

        return formatedAssetBalnce;
    }

    async getTransactionsHistory(req, res) {
        let typeParam = req.params.type;
        if (typeParam !== undefined) {
            let pageNo = parseInt(req.query.page_no)
            let size = parseInt(req.query.size)
            let query = {}

            let payloads = {
                type: (typeParam === 'withdraw') ? 1 : 2,
                user: req.user.user,
                is_deleted: false
            };

            if (pageNo < 0 || pageNo === 0) {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "invalid page number, should start with 1"
                }))
            }

            query.skip = size * (pageNo - 1)
            query.limit = size

            // Find some documents
            transactions.countDocuments(payloads, (err, totalCount) => {
                if (err) {
                    return res.status(200).json(this.successFormat({
                        "data": [],
                        "pages": 0,
                        "totalCount": 0
                    }, null, 'transactions', 200));
                } else {
                    transactions
                        .find(payloads)
                        .select('address amount final_amount date')
                        .skip(query.skip)
                        .limit(query.limit)
                        .populate({
                            path: 'asset',
                            select: 'asset_name asset_code -_id'
                        })
                        .exec()
                        .then((data) => {
                            if (!data.length) {
                                return res.status(200).json(this.successFormat({
                                    "data": [],
                                    "pages": 0,
                                    "totalCount": 0
                                }, null, 'transactions', 200));
                            } else {
                                var totalPages = Math.ceil(totalCount / size);
                                return res.status(200).json(this.successFormat({
                                    "data": data,
                                    "pages": totalPages,
                                    "totalCount": totalCount
                                }, null, 'transactions', 200));
                            }
                        });
                }
            });
        } else {
            return res.status(200).json(this.successFormat({
                "data": {
                    'type': type
                }
            }, null, 'asset-balance', 200));
        }
    }

    postWithdrawValidation(req) {
        let schema = Joi.object().keys({
            asset: Joi.string().required(),
            amount: Joi.number().positive().required(),
            ip: Joi.string().required()
        });

        return Joi.validate(req, schema, {
            abortEarly: false,
            language: {
                escapeHtml: true
            }
        });
    }

    async withdrawValidate(req, res) {
        let requestData = req.body.data.attributes;
        let getAsset = await assets.findById(requestData.asset);
        let amount = Number(requestData.amount)
        if (getAsset) {
            if (getAsset.is_suspend) {
                return {
                    status: false,
                    type: 'suspend'
                };
            } else if (getAsset.minimum_withdraw > amount || getAsset.maximum_withdraw < amount) {
                return {
                    status: false,
                    type: 'minimum_maximum',
                    minimum_withdraw: getAsset.minimum_withdraw,
                    maximum_withdraw: getAsset.maximum_withdraw,
                };
            } else {
                let payloads = {};
                payloads.user_id = req.user.user_id;
                payloads.asset = getAsset.asset_code.toUpperCase();

                let apiResponse = await apiServices.matchingEngineRequest('post', 'balance/query', this.requestDataFormat(payloads), res, 'data');
                let available = apiResponse.data.attributes[payloads.asset].available
                if (available !== undefined && amount < available) {
                    return {
                        status: true
                    };
                } else {
                    return {
                        status: false,
                        type: 'balance'
                    };
                }
            }
        } else {
            return {
                status: false,
                type: 'invalid'
            };
        }
    }

    async postWithdraw(req, res) {
        let requestData = req.body.data.attributes;
        if (req.body.data.id !== undefined && requestData.asset != undefined) {
            let validateWithdraw = await this.withdrawValidate(req, res);
            if (validateWithdraw.status) {
                let withdraw = await withdrawAddress.findOne({
                    '_id': req.body.data.id,
                    'asset': requestData.asset
                });
                if (withdraw.address !== undefined) {
                    try {
                        let timeNow = moment().format('YYYY-MM-DD HH:mm:ss');
                        let data = {
                            user: new mongoose.Types.ObjectId(req.user.user),
                            asset: new mongoose.Types.ObjectId(requestData.asset),
                            address: withdraw.address,
                            type: 1,
                            amount: requestData.amount,
                            ip: requestData.ip,
                            final_amount: requestData.amount,
                            status: 4,
                            is_deleted: false,
                            created_date: timeNow
                        };
                        let returnId = await this.insertNotification(data);
                        return res.status(200).json(this.successFormat({
                            'message': 'Your withdrawal request posted successfully. Waiting for your confirmation. Please check your email'
                        }, returnId, 'withdraw', 200));
                    } catch (err) {
                        return res.status(500).send(err.message);
                    }
                } else {
                    return res.status(400).json(this.errorMsgFormat({
                        "message": "invalid address id"
                    }, 'withdraw'));
                }
            } else {
                let msg = 'Invalid request';
                if (validateWithdraw.type === 'balance') {
                    msg = 'Your balance is too low Please check.'
                } else if (validateWithdraw.type === 'suspend') {
                    msg = 'This coin has suspended. Please contact support@beldex.io'
                } else if (validateWithdraw.type === 'minimum_maximum') {
                    msg = `Please request withdraw ${validateWithdraw.minimum_withdraw} to ${validateWithdraw.maximum_withdraw}`
                }

                return res.status(400).json(this.errorMsgFormat({
                    "message": msg
                }, 'withdraw'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "invalid request"
            }, 'withdraw'));
        }
    }
    async insertNotification(data) {
        let asset = await assets.findById(data.asset);
        let transactions = _.pick(data, ['user', 'asset', 'address', 'type', 'amount', 'final_amount', 'status', 'created_date', 'is_deleted']);
        let transactionId = new transactions(transactions).save();
        let beldexId = new beldexNotification({user: new mongoose.Types.ObjectId(transactions.user),
                type: 1,
                notify_type: 'withdrawConfirmation',
                notify_data: null,
                status: 1,
                created_date: transactions.created_date}).save();              
        
        let notifyId = beldexId._id;
        let transactionsId = transactionId._id;
        let emailData = {
                user_id: new mongoose.Types.ObjectId(transactions.user),
                verification_code: notifyId,
                amount: transactions.amount,
                asset_code: asset.asset_code,
                address: transactions.address,
                ip: data.ip,
                time: data.created_date
            };
       
            beldexNotification.findOneAndUpdate({'_id': notifyId }, {
                'notify_data': {
                    'transactions': transactionsId,
                    'email_data': emailData
                }});
            

        // send an confirmation notification
        this.sendWithdrawNotification(emailData);

        return notifyId;
    }

    sendWithdrawNotification(data) {
        let serviceData = {
            "subject": `Confirm Your Withdraw Request From ${data.ip} ( ${data.time} )`,
            "email_for": "wallet-withdraw",
            "user_id": data.user_id,
            'amount': data.amount,
            'asset_code': data.asset_code,
            'address': data.address,
            'verification_code': data.verification_code
        };

        return apiServices.sendEmailNotification(serviceData);
    }

    async resendWithdrawNotification(req, res) {
        if (req.body.data.id !== undefined && req.body.data.id !== null) {
            let data = await beldexNotification.findOne({
                'notify_data.transactions': new mongoose.Types.ObjectId(req.body.data.id)
            });
            if (data && data.notify_data.email_data !== undefined && data.status === 1) {
                // send an confirmation notification
                this.sendWithdrawNotification(data.notify_data.email_data);
                return res.status(200).json(this.successFormat({
                    "message": "Mail resended successfully"
                }, 'withdraw'));
            } else {
                return res.status(404).json(this.errorMsgFormat({
                    "message": "Request already processed / invalid request"
                }, 'withdraw'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "invalid request"
            }, 'withdraw'));
        }
    }

    patchWithdrawConfirmationValidation(req) {
        let schema = Joi.object().keys({
            verification_code: Joi.string().required(),
            accept: Joi.boolean().required()
        });

        return Joi.validate(req, schema, {
            abortEarly: false,
            language: {
                escapeHtml: true
            }
        });
    }

    async patchWithdrawConfirmation(req, res) {
        let requestData = req.body.data.attributes;
        if (requestData.verification_code !== undefined && requestData.verification_code !== null && requestData.accept !== undefined && requestData.accept !== null) {
            let notify = await beldexNotification.findOne({
                _id: requestData.verification_code
            });
            if (notify.status === 1) {

                // update the details to matching engine and transactions
                let response = await this.updateWithdrawRequest(notify, req, res)
                if (response.data.attributes.status !== undefined && response.data.attributes.status === 'success') {
                    return res.status(200).json(this.successFormat({
                        "message": "Your confirmation request processed successfully."
                    }, 'withdraw'));
                } else {
                    return res.status(400).json(this.errorMsgFormat({
                        "message": (response.data.attributes.status !== undefined)
                    }, 'withdraw'));
                }
            } else {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "This request alreay processed."
                }, 'withdraw'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "invalid request"
            }, 'withdraw'));
        }
    }

    async updateWithdrawRequest(withdraw, req, res) {
        let requestData = req.body.data.attributes;

        // change the withdraw notificaiton status
        withdraw.status = 2;
        withdraw.save();

        // update the transaction status
        let transaction = await transactions.findOneAndUpdate({
            _id: withdraw.notify_data.transactions,
            is_deleted: false
        }, {
            $set: {
                status: 2
            }
        }).populate('asset');
        if (transaction) {
            let asset = transaction.asset;
            let payloads = {
                "user_id": req.user.user_id,
                "asset": asset.asset_code,
                "business": (requestData.accept) ? "withdraw" : "deposit",
                "business_id": Math.floor(Math.random() * Math.floor(10000000)),
                "change": (requestData.accept) ? `-${transaction.amount}` : `${transaction.amount}`,
                "detial": {}
            }
            let response = await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');
            return response;
        } else {
            return false;
        }
    }

    async deleteWithdraw(req, res) {
        let ID = req.params.id;
        if (ID !== undefined) {
            // find and update the reccord
            await transactions.findOneAndUpdate({
                    _id: ID,
                    status: 4
                }, {
                    $set: {
                        is_deleted: true
                    }
                })
                .then(result => {
                    return res.status(202).send(this.successFormat({
                        'message': 'Your requested record deleted successfully.'
                    }, result._id, 'withdraw', 202));
                })
                .catch(err => {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Invalid request / Request is processing.'
                    }, 'withdraw'));
                });
        } else {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid request.'
            }, 'withdraw', 400));
        }
    }
}

module.exports = new Wallet;