const _ = require('lodash');
const Controller = require('./controller');
const ieoList = require('../db/ieo-details');
const ieoTokenSale = require('../db/ieo-token-sale')
const apiService = require('../services/api');
const assets = require('../db/assets')
const users = require('../db/users')
const tokenSale = require('../db/ieo-token-sale');
class ieo extends Controller {

    async ieoList(req, res) {
        try {
            let checkIeoList = await ieoList.find({}).select('-ieo_user_id').populate({
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

            return res.send(this.successFormat({ data: checkIeoList }, '', 'ieo-details')).status(200);
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
            return res.send(this.successFormat({ data: checkIeoDetails }, '', 'ieo-details')).status(200);
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': error.message
            }, 'ieo-details', 500));
        }
    }

    async addTokenSale(req, res) {
        try {
            let data = req.body.data.attributes;
            let checkIeoDetails = await ieoList.findOne({ _id: req.params.ieo_id });
            if (!checkIeoDetails) {
                return res.send(this.errorMsgFormat({ message: 'Ieo id is not be found' }))
            }
            let checkUser = await users.findOne({ _id: checkIeoDetails.ieo_user_id });
            let asset = await assets.findOne({ _id: checkIeoDetails.asset });
            let buyAsset = await assets.findOne({ _id: data.asset });
            let amount = await this.calculateAmount(data, checkIeoDetails.token_price);
            let balanceEnquiry = await this.checkBalance(checkUser.user_id, asset.asset_code, data.amount, 'ieo');
            if (balanceEnquiry.status) {
                let balanceEnquiry = await this.checkBalance(req.user.user_id, buyAsset.asset_code, amount, 'user');
                if (!balanceEnquiry.status) {
                    return res.status(400).send(balanceEnquiry.error)
                }
                let updateBalance = await this.BalanceUpdate(req, checkUser, asset, data, amount, checkIeoDetails)
                if (updateBalance.status) {
                    Object.assign(data,{
                        user: req.user.user,
                        ieo: req.params.ieo_id,
                        buy_asset: data.asset
                    });
                    await new ieoTokenSale(data).save();
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
                    return { status: true }
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
            req.user = { user_id: 31204, user: '5df777762be0fe0011cb0135' }
            let user = req.user.user;
            let history = await tokenSale.find({ user }).populate({
                path: 'buy_asset',
                select: 'asset_code asset_name -_id'
            }).populate({
                path: 'ieo',
                select: 'asset -_id',
                populate: {
                    path: 'asset',
                    select: 'asset_name asset_code -_id'
                }
            });
            return res.send(this.successFormat({ data: history }, '', 'ieo-details')).status(200);
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                'message': error.message
            }, 'ieo-details', 500));
        }
    }
}
module.exports = new ieo()