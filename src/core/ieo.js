const Controller = require('./controller');
const ieoList = require('../db/ieo-details');
const ieoTokenSale = require('../db/ieo-token-sale')
const apiService = require('../services/api');
const assets = require('../db/assets')
const users = require('../db/users')
class ieo extends Controller {

    async ieoList(req, res) {
        let checkIeoList = await ieoList.find({}).select('-ieo_user_id').populate({
            path: 'asset',
            select: 'asset_name asset_code _id logo_url '
        })
            .populate({
                path: 'asset_details',
                select: 'social_contacts video content'
            }).exec()

        if (checkIeoList.length == 0) {
            return res.send(this.successFormat({ data: [] })).status(200)
        }
        return res.send(this.successFormat({ data: checkIeoList })).status(200)
    }

    async ieoDetails(req, res) {
        let checkIeoDetails = await ieoList.findOne({ _id: req.params.ieo_id }).select('-ieo_user_id').populate({
            path: 'asset',
            select: 'asset_name asset_code _id logo_url '
        })
            .populate({
                path: 'asset_details',
                select: 'social_contacts video content'
            }).exec()
        if (!checkIeoDetails) {
            return res.send(this.successFormat({ data: [] })).status(200)
        }
        return res.send(this.successFormat({ data: checkIeoDetails })).status(200)
    }

    async addTokenSale(req, res) {
        let data = req.body.data.attributes;
        let checkIeoDetails = await ieoList.findOne({ _id: req.params.ieo_id });
        if (!checkIeoDetails) {
            return res.send(this.errorMsgFormat({ message: 'Ieo id is not be found' }))
        }
        let checkUser = await users.findOne({ _id: checkIeoDetails.ieo_user_id });
        let asset = await assets.findOne({ _id: checkIeoDetails.asset })
        let amount = await this.calculateAmount(data, checkIeoDetails.token_price);
        let balanceEnquiry = await this.checkBalance(checkUser.user_id, asset.asset_code, data.amount)
        if (balanceEnquiry.status) {
            let balanceEnquiry = await this.checkBalance(req.user.user_id, 'USDT', amount)
            if (!balanceEnquiry.status) {
                return res.status(400).send(balanceEnquiry.error)
            }
            let updateBalance = await this.BalanceUpdate(req, checkUser, asset, data, amount, checkIeoDetails)
            if (updateBalance.status) {
                data['user'] = req.user.user;
                data['ieo'] = req.params.ieo_id
                await new ieoTokenSale(data).save();
                return res.send(this.successFormat({ message: "Your data has been added", supply: checkIeoDetails.session_supply })).status(200)
            }
            return res.status(400).send(updateBalance.error)
        }
        return res.status(400).send(balanceEnquiry.error)

    }
    async checkAndUpdateBalance(owner, customer, asset, amount) {

        let checkOwnerUpdateBalance = await this.UpdateBalance(owner, amount, asset)
        if (checkOwnerUpdateBalance.status) {
            let checkCustomer = await this.UpdateBalance(customer, amount, asset, 'deposit');
            if (checkCustomer.status) {
                return { status: true }
            }
            return { status: false, error: checkCustomer.error }
        }
        return { status: false, error: checkOwnerUpdateBalance.error }

    }

    async UpdateBalance(user, amount, asset, type = 'withdraw') {
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
    }

    async checkBalance(user, asset, amount) {
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
            return { status: false, error: this.errorMsgFormat({ 'message': "amount is too low" }) }
        }
        return { status: false, error: balanceQuery }
    }


    async BalanceUpdate(req, checkUser, asset, data, amount, ieoUser) {
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
    }

    async calculateAmount(data, tokenPrice) {

        return tokenPrice * data.amount
    }




}
module.exports = new ieo()