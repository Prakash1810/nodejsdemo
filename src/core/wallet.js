const moment = require('moment');
const controller = require('../core/controller');
const assets = require('../db/assets');
const userAddress = require('../db/user-address');
const withdrawAddress = require('../db/withdrawal-addresses');
const users = require('../db/users');
const coinAddressValidator = require('wallet-address-validator');
const apiServices = require('../services/api');
const config = require('config');
const _ = require('lodash');
const transactions = require('../db/transactions');
const beldexNotification = require('../db/beldex-notifications');
const user = require('../core/user');
const mongoose = require('mongoose');
const configs = require('../db/config');
const rewards = require('../db/reward-history');
const helpers = require('../helpers/helper.functions');
const redis = helpers.redisConnection()
const discount = require("../db/withdraw-discount");
const { IncomingWebhook } = require('@slack/webhook');
const assetDetails = require('../db/asset-details');
const blurt = require('@blurtfoundation/blurtjs');
require('dotenv').config();
// const Fawn = require("fawn");

// Fawn.init(`mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_NAME}`);

class Wallet extends controller {


    async discountCalculation(user, data) {
        let checkDiscount = await discount.find({ user: user, is_active: true });
        let i = 0;
        while (i < checkDiscount.length) {
            let j = 0;
            while (j < data.length) {
                if (data[j].asset_code == checkDiscount[i].asset_code) {
                    data[j].withdrawal_fee = data[j].withdrawal_fee - (data[j].withdrawal_fee * (checkDiscount[i].discount / 100))
                }
                j++
            }
            i++;
        }

        return data;
    }

    async getAssets(req, res) {
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

        // Find some documents
        assets.countDocuments({
            is_active: true
        }, async (err, totalCount) => {
            if (err) {
                return res.status(200).json(this.successFormat({
                    "data": [],
                    "pages": 0,
                    "totalCount": 0
                }, null, 'assets', 200));
            } else {
                assets.find({
                    is_active: true
                }, '_id asset_name asset_code logo_url exchange_confirmations block_url token  withdrawal_fee minimum_withdrawal deposit withdraw delist minimum_deposit payment_id type maintenance withdraw_fee_percentage precision', query, async (err, data) => {
                    if (err || !data.length) {
                        return res.status(200).json(this.successFormat({
                            "data": [],
                            "pages": 0,
                            "totalCount": 0
                        }, null, 'assets', 200));
                    } else {
                        // await this.discountCalculation(req.user.user, data)
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
        let isCheckDelist = await this.assetDelist(asset);
        if (isCheckDelist.status == false) {
            return res.status(400).send(this.errorMsgFormat({
                'message': isCheckDelist.err
            }, 'asset-balance', 400));
        }
        let isChecked = await assets.findOne({ _id: asset, is_active: true });
        if (!isChecked.deposit) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Deposits have been disabled for this asset.'
            }, 'asset-balance', 400));
        }
        if (asset !== undefined && asset !== '' && asset !== null) {
            let getAddress = await userAddress.findOne({
                asset: asset,
                user: req.user.user
            });

            if (!getAddress && isChecked.auto_address_generate == true) {
                let data = Object.assign({}, {
                    coin: isChecked.asset_code,
                    user_id: req.user.user_id,
                    user: req.user.user,
                    asset: asset
                });
                await apiServices.axiosAPI(data);
                return res.status(200).json(this.successFormat({
                    "message": `Address has been created for ${data.coin}.`
                }, asset, 'address'));
            } else {
                return res.status(200).json(this.successFormat({
                    'asset_code': isChecked.asset_code,
                    'address': getAddress.address,
                    'paymentid': (getAddress.paymentid) ? getAddress.paymentid : null
                }, asset, 'address'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "Invalid request"
            }, 'assets', 400));
        }
    }

    async coinAddressValidate(address, asset) {
        let getAsset = await assets.findOne({ _id: asset });
        let asset_code;
        if (getAsset) {
            if (!getAsset.validate_address) {
                // check if bdx
                if (getAsset.asset_code.toLowerCase() === 'bdx') {
                    if (address.length <= 8) {
                        return false;
                    }
                    return true;
                }
                return true;
            }
            if (getAsset.token != null && getAsset.token != undefined) {
                asset_code = getAsset.token;
            } else {
                asset_code = getAsset.asset_code;
            }

            return coinAddressValidator.validate(address, asset_code.toLowerCase());
        } else {
            return false;
        }
    }

    async postWithdrawAddress(req, res) {
        let requestData = req.body.data.attributes;
        let isCheckDelist = await this.assetDelist(requestData.asset);
        if (isCheckDelist.status == false) {
            return res.status(400).send(this.errorMsgFormat({
                'message': isCheckDelist.err
            }, 'asset-balance', 400));
        }
        let checkG2f = await users.findOne({ _id: req.user.user, google_auth: true });
        if (checkG2f) {
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

        } else {
            if (requestData.otp == null || undefined) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'OTP must be provided.'
                }, 'user', 400));
            }
            req.body.data['id'] = req.user.user;
            let checkOtp = await user.validateOtpForEmail(req, res, "withdraw address");
            if (checkOtp.status == false) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': checkOtp.err
                }, 'user', 400));
            }
        }
        // check addres is valid or not
        let isValid = await this.coinAddressValidate(requestData.address, requestData.asset);
        if (isValid !== true) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'Invalid asset address.'
            }, 'withdrawAddress'));
        }

        // check address already exists
        let checkAddress = await withdrawAddress.findOne({
            'address': requestData.address,
            'user': req.user.user,
            'coin': requestData.coin,
            'is_deleted': false
        });

        if (checkAddress) {
            return res.status(400).send(this.errorMsgFormat({
                'message': 'This address already exist.'
            }, 'withdrawAddress'));
        } else {
            withdrawAddress.create({
                user: req.user.user,
                asset: requestData.asset,
                label: requestData.label,
                coin: requestData.coin,
                address: requestData.address,
                payment_id: requestData.payment_id,
                is_whitelist: (requestData.is_whitelist !== undefined) ? requestData.is_whitelist : false
            }, async (err, address) => {
                if (err) {
                    return res.status(500).json(this.errorMsgFormat({
                        'message': err.message
                    }, 'withdrawAddress', 500));
                } else {
                    await helpers.publishAndStoreData({ publish: { type: 'System Message', title: 'Address Whitelist', content: `Address for ${address.coin} has been added successfully`, isStore: true }, store: { activity: `Address for ${address.coin} has been added successfully`, at: new Date, ip: req.info.ip } }, req.user.user, 'both', `NOTIFICATIONS:${req.user.user_id}`);
                    return res.status(200).json(this.successFormat({
                        'message': 'Address for the chosen asset has been added successfully.',
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
                        'message': 'The changes you made were saved successfully.'
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
                        'message': 'Your request was successfully completed.'
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
                "message": "Invalid page number. The page number should start with 1."
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
                    .select('_id  address label is_whitelist payment_id')
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
            })
            .select('-_id  address label is_whitelist payment_id');

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
            assetNames = [],
            assetCode = [],
            asset = [];
        let collectOfAssetName = {},
            noofAsset;
        payloads.user_id = req.user.user_id;
        if (req.query.asset_code !== undefined) {
            asset.push(req.query.asset_code.toUpperCase());
            payloads.asset = asset;
            noofAsset = await assets.findOne({ asset_code: req.query.asset_code, is_active: true });
            if (noofAsset) {
                collectOfAssetName[noofAsset.asset_code] = noofAsset.asset_name.toLowerCase();
                assetCode.push(noofAsset.asset_code);
                assetNames.push(noofAsset.asset_name.toLowerCase());
            } else {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'Asset could not be found.'
                }, 'asset-balance', 400));
            }
        } else {

            noofAsset = await assets.find({ is_active: true });
            _.map(noofAsset, function (asset) {
                collectOfAssetName[asset.asset_code] = asset.asset_name.toLowerCase();
                assetCode.push(asset.asset_code);
                assetNames.push(asset.asset_name.toLowerCase());

            });
        }
        let reward = await rewards.find({ user: req.user.user, reward_asset: "BDX" });
        let i = 0;
        let sum = 0;
        while (i < reward.length) {
            sum += Number(reward[i].reward);
            i++;
        }
        let apiResponse = await apiServices.matchingEngineRequest('post', 'balance/query', this.requestDataFormat(payloads), res, 'data');
        // let marketResponse = await apiServices.marketPrice(assetNames);
        let marketResponse = await apiServices.getmarketPrice(assetNames, assetCode, res);
        let formatedResponse = await this.currencyConversion(apiResponse.data.attributes, marketResponse, collectOfAssetName);
        await this.addPrecision(formatedResponse, noofAsset)
        return res.status(200).json(this.successFormat({
            "data": formatedResponse,
            sum
        }, null, 'asset-balance', 200));
    }

    addPrecision(formatedResponse, asset) {
        for (let i = 0; i < asset.length; i++) {
            (formatedResponse[asset[i].asset_code]) ? formatedResponse[asset[i].asset_code]['precision'] = asset[i].precision : ''
        }
    }

    currencyConversion(matchResponse, marketResponse, assetsJson) {
        let formatedAssetBalnce = {};
        for (let result in matchResponse) {
            if (assetsJson[result]) {
                let btc, usd;
                if (_.isEmpty(marketResponse[assetsJson[result]])) {
                    btc = 0, usd = 0;
                } else {
                    btc = marketResponse[assetsJson[result]].btc;
                    usd = marketResponse[assetsJson[result]].usd;
                }
                Object.assign(formatedAssetBalnce, {
                    [result]: Object.assign({
                        'available': {
                            'balance': Number(matchResponse[result].available),
                            'btc': Number((matchResponse[result].available) * btc).toFixed(8),
                            'usd': Number((matchResponse[result].available) * usd).toFixed(2)
                        },
                        'freeze': {
                            'balance': Number(matchResponse[result].freeze),
                            'btc': Number((matchResponse[result].freeze) * btc).toFixed(8),
                            'usd': Number((matchResponse[result].freeze) * usd).toFixed(2)
                        },
                    })
                });
                //    let formatedAssetBalnce[result] = Object.assign({},{
                //         'available': {
                //             'balance': Number(matchResponse[result].available),
                //             'btc': Number(matchResponse[result].available) * btc,
                //             'usd': Number(matchResponse[result].available) * usd
                //         },
                //         'freeze': {
                //             'balance': Number(matchResponse[result].freeze),
                //             'btc': Number(matchResponse[result].freeze) * btc,
                //             'usd': Number(matchResponse[result].freeze) * usd
                //         },
                //     })
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
                type: (typeParam === 'withdraw') ? "1" : "2",
                user: req.user.user,
                is_deleted: false
            };

            if (pageNo < 0 || pageNo === 0) {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "Invalid page number. The page number should start with 1."
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
                        .select('address amount final_amount date tx_hash confirmation amount status txtime fee')
                        .skip(query.skip)
                        .limit(query.limit)
                        .populate({
                            path: 'asset',
                            select: 'asset_name asset_code _id'
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
                                if (typeParam === 'withdraw') {
                                    for (var i = 0; i < data.length; i++) {
                                        if (data[i].status == "0") {
                                            data.splice(i, 1);
                                            i--;
                                        }

                                    }

                                }
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

    async withdrawValidate(req, res) {
        let requestData = req.body.data.attributes;
        let getAsset = await assets.findById(requestData.asset);
        let amount = Number(requestData.amount);
        if (getAsset) {
            if (getAsset.is_suspend) {
                return {
                    status: false,
                    type: 'suspend'
                };
            } else {
                let payloads = {},
                    asset = [];
                payloads.user_id = req.user.user_id;
                asset.push(getAsset.asset_code.toUpperCase());
                payloads.asset = asset
                let apiResponse = await apiServices.matchingEngineRequest('post', 'balance/query', this.requestDataFormat(payloads), res, 'data');
                let available = apiResponse.data.attributes[payloads.asset].available;
                //let checkPending = await transactions.find({ user: req.user.user, asset: getAsset._id, type: "1", status: "1" })
                //let i = 0;
                //let pendingTotal = 0;
                // while (i < checkPending.length) {
                //     pendingTotal += checkPending[i].final_amount
                //     i++;
                // }
                // if (requestData.amount > Number(available) - pendingTotal) {
                //     return {
                //         status: false,
                //         type: 'non-Balance'
                //     };
                // }
                // if (getAsset.asset_code == 'BDX') {
                //     let reward = await rewards.find({ user: req.user.user, reward_asset: "BDX" });
                //     let i = 0;
                //     let sum = 0;
                //     while (i < reward.length) {
                //         sum += Number(reward[i].reward);
                //         i++;
                //     }
                //     if (amount > (Number(available) - sum)) {
                //         return {
                //             status: false,
                //             type: 'low-balance'
                //         };
                //     }

                // }
                if (available !== undefined && amount <= available) {
                    return {
                        status: true,
                        matchingApiAmount: available,
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
        let withdraw = null;
        let requestData = req.body.data.attributes;
        let checkUser = await users.findOne({ _id: req.user.user });
        let config = await configs.findOne({ key: 'withdraw limit' });
        if (!checkUser.kyc_verified) {
            if (checkUser.dailyWithdrawAmount > config.value.daily) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': `Since you have not verified your KYC, you can only withdraw crypto equivalent of ${config.value.daily} USDT/day. Please verify your KYC to unlock unlimited withdrawals.`,
                }, 400));
            }
            if (checkUser.monthWithdrawAmount > config.value.monthly) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': `Since you have not verified your KYC, you can only withdraw crypto equivalent of ${config.value.monthly} USDT/month. Please verify your KYC to unlock unlimited withdrawals.`,
                }, 400));
            }
        }

        let checkAsset = await assets.findOne({ _id: requestData.asset, withdraw: true, is_active: true });
        if (checkAsset) {
            if (checkAsset.minimum_withdrawal > requestData.amount) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': `The minimum withdrawal amount for the chosen asset is ${checkAsset.minimum_withdrawal} ${checkAsset.asset_code}.`,
                }, 400));
            }

            if (!checkUser.withdraw) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': 'You cannot make a withdrawal. Either your password was recently changed within 24 hours or withdrawal has been disabled. Please contact support.'
                }, 'user', 400));
            }

            if (checkAsset.asset_code == 'BDX' || checkAsset.asset_code == 'XMR') {
                if (requestData.hasOwnProperty('payment_id')) {
                    if (requestData.payment_id.length < 16 || requestData.payment_id.length > 64) {
                        return res.status(400).send(this.errorMsgFormat({
                            'message': 'Payment Id must be 16 to 64 character string .'
                        }, 'user', 400));
                    }
                }
            }

            if (checkAsset.asset_code == 'TREEP') {
                if (!requestData.payment_id) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Payment Id must be provided.'
                    }, 'user', 400));
                }
            } else if (checkUser.google_auth) {
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

            } else {
                if (requestData.otp == null || undefined) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'OTP must be provided.'
                    }, 'user', 400));
                }
                req.body.data['id'] = req.user.user;
                let checkOtp = await user.validateOtpForEmail(req, res, "withdraw confirmation");
                if (checkOtp.status == false) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': checkOtp.err
                    }, 'user', 400));
                }
            }
            if (requestData.asset != undefined) {
                let checkWithdraw = await assets.findOne({ _id: requestData.asset });
                if (!checkWithdraw.withdraw) {
                    return res.status(400).send(this.errorMsgFormat({
                        'message': 'Withdrawals have been disabled for this asset.'
                    }, 'withdraw', 400));
                }
                let validateWithdraw = await this.withdrawValidate(req, res);
                if (validateWithdraw.status) {
                    // const pendingValue = await transactions.find({ user: req.user.user, asset: requestData.asset, type: '1', status: '1' });
                    // let value = 0, i = 0;
                    // let finalAmount = 0;
                    // while (i < pendingValue.length) {
                    //     value += pendingValue[i].final_amount;
                    //     i++;
                    // }
                    // finalAmount = Number(validateWithdraw.matchingApiAmount) - value;
                    // if (finalAmount >= requestData.amount) {
                    if ((requestData.withdraw_id != null && requestData.withdraw_id != undefined)) {
                        withdraw = await withdrawAddress.findOne({
                            '_id': requestData.withdraw_id,
                            'asset': requestData.asset,
                        });
                    } else if (requestData.address != null && requestData.address != undefined) {
                        let isValid = await this.coinAddressValidate(requestData.address, requestData.asset);
                        if (isValid !== true) {
                            return res.status(400).send(this.errorMsgFormat({
                                'message': 'Invalid asset address.'
                            }, 'withdrawAddress'));
                        }
                        withdraw = {
                            address: requestData.address
                        }
                    }
                    if (withdraw.address !== undefined || withdraw.address != null) {
                        try {
                            let data = Object.assign({}, {
                                user: new mongoose.Types.ObjectId(req.user.user),
                                user_id: req.user.user_id,
                                asset: new mongoose.Types.ObjectId(requestData.asset),
                                address: withdraw.address,
                                type: 1,
                                amount: requestData.amount,
                                ip: requestData.ip,
                                final_amount: requestData.amount,
                                status: "0",
                                is_deleted: false,
                                date: moment().format('YYYY-MM-DD HH:mm:ss'),
                                payment_id: requestData.payment_id ? requestData.payment_id : null
                            });
                            let returnId = await this.insertNotification(data, validateWithdraw.matchingApiAmount, res);
                            await helpers.publishAndStoreData({ store: { activity: `Withdraw Attempt for ${data.final_amount} ${checkAsset.asset_code}`, at: new Date, ip: req.info.ip } }, req.user.user, 'store', `NOTIFICATIONS::${req.user.user_id}`);
                            return res.status(200).json(this.successFormat({
                                'message': 'Your request for withdrawal has been received. A confirmation email has been sent to your registered email address. Please confirm your request.'
                            }, returnId, 'withdraw', 200));
                        } catch (err) {
                            return res.status(500).send(err.message);
                        }
                    } else {
                        return res.status(400).json(this.errorMsgFormat({
                            "message": "Asset address must be provided."
                        }, 'withdraw'));
                    }

                    // }
                    // else {
                    //     return res.status(400).json(this.errorMsgFormat({
                    //         "message": "The withdrawal amount you entered is more than your balance. Please enter a lesser amount."
                    //     }, 'withdraw'));
                    // }



                } else {
                    let msg = 'Invalid request';
                    if (validateWithdraw.type === 'balance') {
                        msg = 'Your balance for the selected asset is too low to make a withdrawal.'
                    } else if (validateWithdraw.type === 'suspend') {
                        msg = 'The selected asset has been disabled temporarily. Please contact support for more information.'
                    } else if (validateWithdraw.type === 'low-balance') {
                        msg = 'Please enter a lesser amount. BDX rewards earned from a referral can be used only for trading.'
                    } else if (validateWithdraw.type === 'non-Balance') {
                        msg = 'The request amount is greater than your available balance.'
                    }

                    return res.status(400).json(this.errorMsgFormat({
                        "message": msg
                    }, 'withdraw'));
                }
            } else {
                return res.status(400).json(this.errorMsgFormat({
                    "message": 'Please choose an asset.'
                }, 'withdraw'));
            }


        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": 'Withdrawals have been disabled for this asset.'
            }, 'withdraw'));
        }




    }
    async insertNotification(data, responseAmount, res) {

        let amount = Number(responseAmount);
        let asset = await assets.findById(data.asset);
        let checkDiscount = await discount.findOne({ user: data.user, asset_code: asset.asset_code, is_active: true });
        let withdrawal_fee = asset.withdrawal_fee;
        let transaction = _.pick(data, ['user', 'asset', 'address', 'type', 'amount', 'final_amount', 'status', 'date', 'is_deleted', 'payment_id']);
        if (asset.withdraw_fee_percentage) {
            withdrawal_fee = transaction.amount * asset.withdraw_fee_percentage / 100;
        }
        let fee = checkDiscount ? withdrawal_fee - (withdrawal_fee * (checkDiscount.discount / 100)) : withdrawal_fee;
        // let bal = amount - transaction.amount;
        // if ((bal - fee) >= 0) {
        //     transaction.fee = fee
        //     transaction.amount = transaction.amount
        // }
        // else {
        //     let remaningFee = fee - bal;
        //     transaction.fee = fee
        //     transaction.amount = transaction.amount - remaningFee;
        // }
        transaction.fee = fee;
        transaction.amount = transaction.amount - fee;
        transaction.amount = await this.precisionAmount(transaction.amount, asset.precision);
        let transactionId = await new transactions(transaction).save();
        let beldexData = {
            user: new mongoose.Types.ObjectId(transaction.user),
            type: 1,
            notify_type: 'withdrawConfirmation',
            notify_data: { transactions: transactionId._id },
            status: 1,
            created_date: transaction.created_date
        }
        let beldexId = await new beldexNotification(beldexData).save();
        let notifyId = beldexId._id;
        let transactionsId = transactionId._id;
        let emailData = Object.assign({}, {
            user: new mongoose.Types.ObjectId(transaction.user),
            user_id: data.user_id,
            verification_code: notifyId,
            amount: transaction.amount,
            asset_code: asset.asset_code,
            address: transaction.address,
            ip: data.ip,
            time: data.date

        });

        beldexNotification.findOneAndUpdate({ '_id': notifyId }, {
            'notify_data': {
                'transactions': transactionsId,
                'email_data': emailData
            }
        });


        // send an confirmation notification
        this.sendWithdrawNotification(emailData, res);

        return notifyId;
    }

    precisionAmount(data, precision) {
        let txnAmount = String(data);
        let precisionAmount = (precision && txnAmount.indexOf('.') > -1) ? txnAmount.substring(0, txnAmount.indexOf('.') + Number(precision + 1)) : txnAmount;
        return precisionAmount;
    }

    sendWithdrawNotification(data, res) {
        let serviceData = Object.assign({}, {
            "subject": `Confirm Your Withdraw Request From ${data.ip} ( ${data.time} )`,
            "email_for": "wallet-withdraw",
            "user_id": data.user,
            "userId": data.user_id,
            'amount': data.amount,
            'asset_code': data.asset_code,
            'address': data.address,
            'verification_code': data.verification_code
        });
        return apiServices.sendEmailNotification(serviceData, res);
    }

    async resendWithdrawNotification(req, res) {
        if (req.body.data.id !== undefined && req.body.data.id !== null) {
            let data = await beldexNotification.findOne({
                'notify_data.transactions': new mongoose.Types.ObjectId(req.body.data.id)
            });
            if (data && data.notify_data.email_data !== undefined && data.status === 1) {
                // send an confirmation notification
                this.sendWithdrawNotification(data.notify_data.email_data, res);
                return res.status(200).json(this.successFormat({
                    "message": "The confirmation email has been resent to your registered email address."
                }, 'withdraw'));
            } else {
                return res.status(404).json(this.errorMsgFormat({
                    "message": "Request already process add Marketed / Invalid request."
                }, 'withdraw'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "Invalid request."
            }, 'withdraw'));
        }
    }

    async patchWithdrawConfirmation(req, res) {
        let requestData = req.body.data.attributes;
        let code = JSON.parse(helpers.decrypt(req.query.code, res));
        if (code.code !== undefined && code.code !== null) {
            let notify = await beldexNotification.findOne({
                _id: code.code,
                user: code.user
            });

            if (notify.status === 1) {
                let date = new Date(notify.created_date);
                let getSeconds = date.getSeconds() + config.get('walletForEmail.timeExpiry');
                let duration = moment.duration(moment().diff(notify.created_date));
                if (getSeconds > duration.asSeconds()) {
                    // update the details to matching engine and transactions
                    // change the withdraw notificaiton status;
                    let response = await this.updateWithdrawRequest(notify, req, res);
                    if (response.data.attributes.status !== undefined && response.data.attributes.status === 'success') {
                        let transactionDetails = await transactions.findOne({
                            _id: notify.notify_data.transactions,
                            user: code.user,
                            is_deleted: false
                        }).populate({
                            path: 'asset',
                            select: 'asset_name asset_code automatic_withdrawal token auto_approved'
                        })
                        notify.status = 2;
                        notify.modified_date = moment().format('YYYY-MM-DD HH:mm:ss')
                        await notify.save();
                        if (transactionDetails.asset.auto_approved) {
                            transactionDetails.status = "4";

                        } else if (transactionDetails.asset.asset_code == 'BLURT') {
                            let getRequestPayload = this;
                            let memo = transactionDetails.payment_id == null || "" ? "" : transactionDetails.payment_id
                            blurt.api.setOptions({ url: process.env.BLURT_URL, useAppbaseApi: true })
                            blurt.broadcast.transfer(process.env.BLURT_SIGNATURE, process.env.BLURT_USERNAME, transactionDetails.address, `${transactionDetails.amount.toFixed(3)} BLURT`, memo, async function (err, result) {
                                // console.log(err, result);
                                if (err != null) {
                                    let payloads = {
                                        "user_id": code.user_id,
                                        "asset": "BLURT",
                                        "business": "deposit",
                                        "business_id": Math.floor(Math.random() * Math.floor(10000000)),
                                        "change": `${transactionDetails.amount + transactionDetails.fee}`,
                                        "detial": {}
                                    }
                                    let response = await apiServices.matchingEngineRequest('patch', 'balance/update', getRequestPayload.requestDataFormat(payloads), res, 'data');
                                    if (response.data.attributes.status !== undefined && response.data.attributes.status === 'success') {
                                        transactionDetails.status = "3";
                                        transactionDetails.txtime = new Date().valueOf()
                                        await transactionDetails.save();
                                        await getRequestPayload.sendMessage(transactionDetails)
                                        return res.status(200).json(getRequestPayload.successFormat({
                                            "message": "Your withdrawal request has been confirmed."
                                        }, 'withdraw'));
                                    }
                                } else {
                                    transactionDetails.height = result.block_num;
                                    transactionDetails.tx_hash = `${result.block_num}/${result.id}`
                                    transactionDetails.txtime = new Date().valueOf()
                                    transactionDetails.status = "2";
                                    await transactionDetails.save();
                                    await getRequestPayload.sendMessage(transactionDetails)
                                    return res.status(200).json(getRequestPayload.successFormat({
                                        "message": "Your withdrawal request has been confirmed."
                                    }, 'withdraw'));
                                }

                            });
                        } else {
                            transactionDetails.status = "1";
                        }
                        transactionDetails.updated_date = moment().format('YYYY-MM-DD HH:mm:ss')
                        await transactionDetails.save();
                        transactionDetails.status == '2' ? await helpers.publishAndStoreData({ publish: { type: 'System Message', title: 'Withdrawal Successful', content: `Withdrawal Success for ${transactionDetails.amount} ${transactionDetails.asset.asset_code}`, at: transactionDetails.updated_date, isStore: true }, store: { activity: `Withdrawal Success for ${transactionDetails.amount} ${transactionDetails.asset.asset_code}`, at: new Date } }, code.user, 'both', `NOTIFICATIONS:${code.user_id}`) : ''
                        await this.sendMessage(transactionDetails)
                        return res.status(200).json(this.successFormat({
                            "message": "Your withdrawal request has been confirmed."
                        }, 'withdraw'));

                    } else {
                        return res.status(400).json(this.errorMsgFormat({
                            "message": response.data.attributes.message
                        }, 'withdraw'));
                    }
                } else {
                    await beldexNotification.findOneAndUpdate({ _id: code.code, user: code.user }, { modified_date: moment().format('YYYY-MM-DD HH:mm:ss'), time_expiry: 'Yes' })
                    return res.status(400).json(this.errorMsgFormat({
                        "message": "This link has expired."
                    }, 'withdraw'));
                }


            } else {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "Invalid request"
                }, 'withdraw'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "Invalid Hash code"
            }, 'withdraw'));
        }
    }
    async updateWithdrawRequest(withdraw, req, res) {
        let code = JSON.parse(helpers.decrypt(req.query.code));
        let requestData = req.body.data.attributes;
        // update the transaction status
        let transaction = await transactions.findOne({
            _id: withdraw.notify_data.transactions,
            user: code.user,
            is_deleted: false
        }).populate('asset');
        if (transaction) {
            let asset = transaction.asset;
            let payloads = {
                "user_id": code.user_id,
                "asset": asset.asset_code,
                "business": "withdraw",
                "business_id": Math.floor(Math.random() * Math.floor(10000000)),
                "change": `-${transaction.amount + transaction.fee}`,
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
                        'message': 'Your request was successfully completed.'
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

    async assetDelist(asset) {
        let delist = await assets.findOne({ _id: asset });
        if (delist) {
            if (!delist.delist) {
                return { status: true }
            } else {
                return { status: false, err: 'The asset is no longer listed.' }
            }
        } else {
            return { status: false, err: 'Asset could not be found.' }
        }

    }

    async sendMessage(transaction) {
        let checkUser = await users.findOne({ _id: transaction.user })
        const url = process.env.SLACK_WEBHOOK_URL;
        const webhook = new IncomingWebhook(url);
        // Send the notification
        (async () => {
            await webhook.send({
                text: `*New Withdrawal Request*\n\n Date: \`${new Date()}\`\nemail: \`${checkUser.email}\`\nAsset: \`${transaction.asset.asset_code}\`\nAmount: \`${transaction.final_amount}\`\nAmount to Sent: \`${transaction.amount}\`\nFee: \`${transaction.fee}\``
            });
        })();
        return
    }

    async getAssetDetails(req, res) {
        try {
            let asset = req.params.asset
            let data = await assetDetails.findOne({ asset }).populate({
                path: 'asset',
                select: 'asset_name asset_code logo_url address_url url'
            })
            return res.status(200).json(this.successFormat({
                "data": data
            }, 'withdraw'));
        } catch (error) {
            return res.status(400).send(this.errorMsgFormat({
                'message': error.message
            }, 'withdraw', 400));
        }

    }

    async addressValidation(req, res) {
        try {
            let data = req.body.data.attributes;
            if (!data.address || !data.asset) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': "Asset and address must be provided."
                }, 'withdraw', 400));
            }
            let isValid = await this.coinAddressValidate(data.address, data.asset);
            if (isValid == false) {
                return res.status(400).send(this.errorMsgFormat({
                    "isValid": isValid
                }, 'withdrawAddress'));
            }
            return res.status(200).json(this.successFormat({
                "isValid": isValid
            }, 'withdraw'));
        } catch (error) {
            return res.status(400).send(this.errorMsgFormat({
                'message': error.message
            }, 'withdraw', 400));
        }
    }

    async getWithdawalFee(client, asset) {
        const authClient = client
        let response = await authClient.account().getWithdrawalFee(asset.toLowerCase());
        return response;
    }

    async okexAutoWithdraw(pendingDetials, filterFee, client) {
        try {
            const authClient = client;
            let payload = Object.assign({}, {
                "amount": pendingDetials.amount,
                "fee": filterFee.min_fee,
                "trade_pwd": process.env.OKEX_TRADEPWD,
                "destination": 4,
                "currency": filterFee.currency.toLowerCase(),
                "to_address": process.env[`${pendingDetials.asset.asset_code}_TOADDRESS`]
            })
            let response = await authClient.account().postWithdrawal(payload);
            console.log(`Response : ${new Date()} : `, response)
            if (response.status || response.result) {
                return { status: true }
            }
            return { status: false, error: "Something went wrong" }
        } catch (error) {
            return { status: false, error: error }
        }

    }
    async blurtGetDeposit(req, res) {
        try {

            if (!req.query.limit) {
                return res.status(400).send(this.errorMsgFormat({
                    'message': `limit is required`
                }, 'withdraw', 400));
            }
            const subController = this;
            blurt.api.setOptions({ url: process.env.BLURT_URL, useAppbaseApi: true })
            blurt.api.getAccountHistory("beldex-hot", -1, Number(req.query.limit), async function (err, result) {
                console.log('Result:', result)
                const transfers = result.filter(tx => tx[1].op[0] === 'transfer');
                transfers.forEach(async (tx) => {

                    const transfer = tx[1].op[1];
                    const { amount, memo, to } = transfer;
                    console.log("Transfer:", transfer)
                    let getDate = new Date(tx[1].timestamp).valueOf()
                    let date = Math.floor(getDate / 1000);
                    let data = {
                        transaction_id: tx[1].trx_id,
                        block_num: tx[1].block
                    }
                    if (to == process.env.BLURT_TO) {
                        console.log("Memo:", memo);
                        console.log("Env:", process.env.ASSET_ID)
                        let check = await userAddress.findOne({ paymentid: memo, asset: process.env.ASSET_ID })
                            .populate({
                                path: 'asset',
                                select: 'asset_name asset_code _id '
                            })
                            .populate({
                                path: 'user',
                                select: 'user_id _id'
                            })
                        console.log("ChecK:", check)
                        if (check != null) {
                            let getTransaction = await redis.get(`${check.asset.asset_code}:${check.user.user_id}:txn:${data.transaction_id}`)
                            if (getTransaction == null) {
                                let changeAmount = amount.substr(0, amount.indexOf(" "));
                                let redisResponse = await subController.redisPayload(check.user.user_id, data.transaction_id, to, changeAmount, data.block_num, date, check.user._id, check.asset._id)
                                let setKey = await redis.set(`${check.asset.asset_code}:${check.user.user_id}:txn:${data.transaction_id}`, data.transaction_id);
                                console.log("SetKey:", setKey)
                                await redis.rpush(`${check.asset.asset_code}:address:public:${check.user._id}`, JSON.stringify(redisResponse))
                                let checkEngine = await subController.balanceUpdate(changeAmount, check.asset, check.user, data, to, date);
                                if (!checkEngine.status) {
                                    return res.status(400).send(subController.errorMsgFormat({
                                        'message': checkEngine.error
                                    }, 'withdraw', 400));
                                }
                                let serviceData = Object.assign({}, {
                                    "subject": `Deposit Success`,
                                    "email_for": "deposit-notification",
                                    "amt": changeAmount,
                                    "coin": check.asset.asset_code,
                                    "user_id": check.user._id
                                });
                                await apiServices.sendEmailNotification(serviceData, res);
                                return;
                            }
                        }

                    }
                });
            });
            return res.status(200).send(this.errorMsgFormat({
                'message': "Balance Update to Matching Engine"
            }, 'withdraw', 200));

        } catch (error) {
            return res.status(400).send(this.errorMsgFormat({
                'message': error.message
            }, 'withdraw', 400));
        }
    }
    async balanceUpdate(amount, asset, user, result, to, time) {
        try {
            let payloads = Object.assign({}, {
                "user_id": user.user_id,
                "asset": asset.asset_code,
                "business": "deposit",
                "business_id": new Date().valueOf(),
                "change": amount.toString(),
                "detial": {}
            });
            let checkStatus = await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), null, 'data');
            if (checkStatus.status) {

                let response = await this.responseData(result.transaction_id, Number(amount), to, '2', user.user_id, user._id, asset._id, result.block_num, time)
                await new transaction(response).save();
                return { status: true }

            }
            return { status: false, error: "Matching Engine Server Problem!" }
        } catch (err) {
            return { status: false, error: err.message }
        }

    }

    async script(req, res) {
        let getData = await transactions.find({ asset: '5f8a2a47ce55760006bb9570' })
        let i = 0;
        while (i < getData.length) {
            let getDate = new Date(getData[i].date).valueOf()
            let date = Math.floor(getDate / 1000);
            getData[i].txtime = date;
            getData[i].save()
            i++;
        }
        return res.status(200).send(this.successFormat({
            'message': "Success"
        }, 'withdraw', 200));
    }


}




module.exports = new Wallet;