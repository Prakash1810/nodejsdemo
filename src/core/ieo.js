const _ = require('lodash');
const mongoose = require('mongoose');
const Controller = require('./controller');
const ieoList = require('../db/ieo-details');
const ieoTokenSale = require('../db/ieo-token-sale')
const apiService = require('../services/api');
const assets = require('../db/assets')
const users = require('../db/users')
const tokenSale = require('../db/ieo-token-sale');
const helperFunctions = require('../helpers/helper.functions');
class ieo extends Controller {

    async ieoList(req, res) {
        try {
            let currentDate = new Date();
            let checkIeoList = await ieoList.find({});
            for (let i = 0; i < checkIeoList.length; i++) {
                let status = '';
                if (currentDate > new Date(checkIeoList[i].start_date) && currentDate < new Date(checkIeoList[i].end_date)) {
                    status = 'ongoing';
                } else if (currentDate > new Date(checkIeoList[i].end_date)) {
                    status = 'completed';
                } else if (currentDate < new Date(checkIeoList[i].start_date)) {
                    status = 'upcoming';
                } else {
                    status = ''
                }
                checkIeoList[i].status = status;
                await checkIeoList[i].save();
            };

            let checkIeoListData = await ieoList.find({}).select('-ieo_user_id').populate({
                path: 'asset',
                select: 'asset_name asset_code _id logo_url '
            }).populate({
                path: 'asset_details',
                select: 'social_contacts video content'
            }).populate({
                path: 'available_currency',
                model: 'assets',
                select: 'asset_code asset_name _id'
            });
            return res.send(this.successFormat({ data: checkIeoListData ? checkIeoListData : [] }, '', 'ieo-details')).status(200);
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': error.message
            }, 'ieo-details', 500));
        }
    }

    async ieoDetails(req, res) {
        try {
            let checkIeoDetails = await ieoList.findOne({ _id: req.params.ieo_id }).select('-ieo_user_id').populate({
                path: 'asset',
                select: 'asset_name asset_code _id logo_url '
            }).populate({
                path: 'asset_details',
                select: 'social_contacts video content'
            }).populate({
                path: 'available_currency',
                model: 'assets',
                select: 'asset_code asset_name _id'
            });
            return res.send(this.successFormat({ data: checkIeoDetails ? checkIeoDetails : [] }, '', 'ieo-details')).status(200);
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': error.message
            }, 'ieo-details', 500));
        }
    }

    async getTokenPrice(ieoDetails, asset_code) {
        return await ieoDetails.token_price.filter((e) => e.asset_code == asset_code)
    }

    async addTokenSale(req, res) {
        try {
            let data = req.body.data.attributes;
            let checkIeoDetails = await ieoList.findOne({ _id: req.params.ieo_id });
            if (!checkIeoDetails) {
                return res.send(this.errorMsgFormat({ message: 'IEO id not found' }))
            }
            let checkUser = await users.findOne({ _id: checkIeoDetails.ieo_user_id });
            let asset = await assets.findOne({ _id: checkIeoDetails.asset });
            let buyAsset = await assets.findOne({ _id: data.asset });
            if (checkIeoDetails.token_price.length == 0) {
                return res.status(500).send(this.errorMsgFormat({
                    'message': 'Price not enter for this supply.'
                }, 'ieo-details', 500));
            }
            let tokenPrice = await this.getTokenPrice(checkIeoDetails, buyAsset.asset_code);
            if (tokenPrice.length == 0) {
                return res.status(500).send(this.errorMsgFormat({
                    'message': 'Selected asset price not found.'
                }, 'ieo-details', 500));
            }
            let amount = await this.calculateAmount(data, Number(tokenPrice[0].price));
            let balanceEnquiryIeo = await this.checkBalance(checkUser.user_id, asset.asset_code, data.amount, 'ieo');
            if (balanceEnquiryIeo.status) {
                let balanceEnquiry = await this.checkBalance(req.user.user_id, buyAsset.asset_code, amount, 'user');
                if (!balanceEnquiry.status) {
                    return res.status(400).send(balanceEnquiry.error)
                }
                let updateBalance = await this.BalanceUpdate(req, checkUser, asset, data, amount, checkIeoDetails)
                if (updateBalance.status) {
                    Object.assign(data, {
                        user: req.user.user,
                        ieo: req.params.ieo_id,
                        buy_asset: data.asset,
                        price: `${Number(tokenPrice[0].price)}`
                    });
                    await new ieoTokenSale(data).save();
                    await helperFunctions.publishAndStoreData({ publish: balanceEnquiryIeo.data, isStore: false }, req.user.user_id, 'publish', 'IEO-SUPPLY')
                    return res.send(this.successFormat({ message: "Your data has been added", supply: checkIeoDetails.session_supply }, '', 'ieo-details')).status(200)
                }
                return res.status(400).send(updateBalance.error)
            }
            return res.status(400).send(balanceEnquiry.error)
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': error.message
            }, 'ieo-details', 500));
        }
    }
    async checkAndUpdateBalance(owner, customer, asset, amount) {
        try {
            let checkOwnerUpdateBalance = await this.UpdateBalance(owner, amount, asset)
            if (checkOwnerUpdateBalance.status) {
                let checkCustomer = await this.UpdateBalance(customer, amount, asset, 'deposit');
                if (checkCustomer.status) {
                    return { status: true }
                }
                return { status: false, error: checkCustomer.error }
            }
            return { status: false, error: checkOwnerUpdateBalance.error }
        } catch (error) {
            return { status: false, error: error.message }
        }
    }

    async UpdateBalance(user, amount, asset, type = 'withdraw') {
        try {
            let payloads = Object.assign({}, {
                "user_id": user,
                "asset": asset,
                "business": type,
                "business_id": new Date().valueOf(),
                "change": type == 'withdraw' ? `-${amount.toString()}` : `${amount.toString()}`,
                "detial": {}
            })
            let updateBalance = await apiService.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), null, 'data');
            if (updateBalance.code == 200) {
                return { status: true }
            }
            return { status: false, error: updateBalance }
        } catch (error) {
            return { status: false, error: error.message }
        }
    }

    async checkBalance(user, asset, amount, who) {
        try {
            let input = {
                "data": {
                    "attributes": {
                        "user_id": user,
                        "asset": [asset]
                    }
                }
            }
            let balanceQuery = await apiService.matchingEngineRequest('post', 'balance/query', input, null, 'query');
            if (balanceQuery.code == 200) {

                if (amount < Number(balanceQuery.data.attributes[asset].available)) {
                    return { status: true, data: { [asset]: Number(balanceQuery.data.attributes[asset].available) } }
                }
                let msg = who == 'ieo' ? `Insufficient IEO supply, Available balance is ${balanceQuery.data.attributes[asset].available}` : `Insufficient balance, Available balance is ${balanceQuery.data.attributes[asset].available}`
                return { status: false, error: this.errorMsgFormat({ 'message': msg }) }
            }
            return { status: false, error: balanceQuery }
        } catch (error) {
            return { status: false, error: error.message }
        }
    }

    async BalanceUpdate(req, checkUser, asset, data, amount, ieoUser) {
        try {
            let checkStatus = await this.checkAndUpdateBalance(checkUser.user_id, req.user.user_id, asset.asset_code, data.amount);
            if (checkStatus.status) {
                let balance = ieoUser.session_supply - data.amount
                ieoUser.session_supply = balance;
                ieoUser.save();
                let checkStatus = await this.checkAndUpdateBalance(req.user.user_id, checkUser.user_id, 'USDT', amount);
                if (checkStatus.status) {
                    return { status: true }
                }
                return { status: false, error: checkStatus.error }
            }
            return { status: false, error: checkStatus.error }
        } catch (error) {
            return { status: false, error: error.message }
        }
    }

    async calculateAmount(data, tokenPrice) {
        return tokenPrice * data.amount
    }

    async ieoHistory(req, res) {
        try {
            let filterAsset = req.query.asset ? mongoose.Types.ObjectId(req.query.asset) : { $exists: true };
            let user = req.user.user;
            let history = await tokenSale.aggregate([
                { $match: { user: mongoose.Types.ObjectId(user) } },
                {
                    $lookup: {
                        from: 'assets',
                        localField: 'buy_asset',
                        foreignField: '_id',
                        as: 'buy_asset',
                    }
                },
                {
                    $lookup: {
                        from: 'ieo-details',
                        localField: 'ieo',
                        foreignField: '_id',
                        as: 'ieo_details'
                    }
                },
                {
                    $lookup: {
                        from: 'assets',
                        localField: 'ieo_details.asset',
                        foreignField: '_id',
                        as: 'ieo_asset'
                    }
                },
                { $match: { 'ieo_details.asset': filterAsset } },
                { $project: { '_id': 1, 'user': 1, 'price': 1, 'amount': 1, 'total': 1, 'buy_asset._id': 1, 'buy_asset.asset_code': 1, 'buy_asset.asset_name': 1, 'ieo_asset._id': 1, 'ieo_asset.asset_code': 1, 'ieo_asset.asset_name': 1 } },
            ]);
            return res.send(this.successFormat({ data: history }, '', 'ieo-details')).status(200);
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': error.message
            }, 'ieo-details', 500));
        }
    }
}
module.exports = new ieo()