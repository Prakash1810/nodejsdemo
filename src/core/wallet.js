const controller = require('../core/controller');
const assets = require('../db/assets');
const userAddress = require('../db/user-address');
const withdrawAddress = require('../db/withdrawal-addresses');
const Joi = require('joi');
const users = require('../db/users');
const coinAddressValidator = require('wallet-address-validator');
const apiServices = require('../services/api');
const config = require('config');
const transactionHistory = require('../db/tranaction-history');



class Wallet extends controller {

    getAssets(req, res) {
        let pageNo = parseInt(req.query.page_no)
        let size = parseInt(req.query.size)
        let query = {}

        if (pageNo < 0 || pageNo === 0) {
            return res.status(404).json(this.errorMsgFormat({
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
                return res.status(404).json(this.errorMsgFormat({
                    "message": "No data found"
                }, 'assets', 404))
            } else {
                assets.find({
                    is_suspend: false
                }, '_id asset_name asset_code logo_url', query, (err, data) => {
                    if (err || !data.length) {
                        return res.status(404).json(this.errorMsgFormat({
                            "message": "No data found"
                        }, 'assets', 404));
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
                return res.status(400).json(this.errorMsgFormat({
                    "message": "No records found."
                }, 'assets', 400));
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
        return coinAddressValidator.validate(address, getAsset.asset_code.toLowerCase());
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
            'address': requestData.address
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

    getWithdrawAddress(req, res) {
        let pageNo = parseInt(req.query.page_no)
        let size = parseInt(req.query.size)
        let query = {}

        let payloads = {
            is_deleted: false,
            user: req.user.user
        };

        if (pageNo < 0 || pageNo === 0) {
            return res.status(404).json(this.errorMsgFormat({
                "message": "invalid page number, should start with 1"
            }))
        }

        query.skip = size * (pageNo - 1)
        query.limit = size

        // Find some documents
        withdrawAddress.countDocuments(payloads, (err, totalCount) => {
            if (err) {
                return res.status(404).json(this.errorMsgFormat({
                    "message": "No data found"
                }, 'address', 404))
            } else {
                withdrawAddress
                    .find(payloads)
                    .select('-_id  address')
                    .skip(query.skip)
                    .limit(query.limit)
                    .populate({
                        path: 'asset',
                        select: 'asset_name asset_code -_id'
                    })
                    .exec()
                    .then((data) => {
                        if (!data.length) {
                            return res.status(404).json(this.errorMsgFormat({
                                "message": "No data found"
                            }, 'withdrawAddress', 404));
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
            return res.status(404).json(this.errorMsgFormat({
                "message": "No data found"
            }, 'withdrawAddress', 404));
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
        payloads.user_id = 1 //req.user.user_id;
        if (req.query.asset_code !== undefined) {
            payloads.asset = req.query.asset_code.toUpperCase();
            assetNames = config.get(`assets.${req.query.asset_code.toLowerCase()}`)
        } else {
            assetNames = 'beldex,bitcoin,ethereum,litecoin,bitcoin-cash,dash';
        }

        let apiResponse = await apiServices.matchingEngineRequest('balance/query', payloads);
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
                user: req.user.user
            };

            if (pageNo < 0 || pageNo === 0) {
                return res.status(404).json(this.errorMsgFormat({
                    "message": "invalid page number, should start with 1"
                }))
            }

            query.skip = size * (pageNo - 1)
            query.limit = size

            // Find some documents
            transactionHistory.countDocuments(payloads, (err, totalCount) => {
                if (err) {
                    return res.status(404).json(this.errorMsgFormat({
                        "message": "No data found"
                    }, 'address', 404))
                } else {
                    transactionHistory
                        .find(payloads)
                        .select('-_id  address amount final_amount date')
                        .skip(query.skip)
                        .limit(query.limit)
                        .populate({
                            path: 'asset',
                            select: 'asset_name asset_code -_id'
                        })
                        .exec()
                        .then((data) => {
                            if (!data.length) {
                                return res.status(404).json(this.errorMsgFormat({
                                    "message": "No data found"
                                }, 'transactions', 404));
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
}

module.exports = new Wallet;