const Controller = require('./controller');
const ieoList = require('../db/ieo-details');
const ieoTokenSale = require('../db/ieo-token-sale')
const apiService = require('../services/api');
const assets = require('../db/assets')
const users = require('../db/users')
class ieo extends Controller {

    async ieoList(req, res) {
        let checkIeoList = await ieoList.find({}).populate({
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
        let checkIeoDetails = await ieoList.findOne({ _id: req.params.ieo_id }).populate({
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
        let checkStatus = await this.checkAndUpdateBalance(checkIeoDetails, 28, data);
        if (checkStatus.status) {
            data['user'] = '5da9c400a91eda036c064c43';
            data['ieo'] = req.params.ieo_id
            await new ieoTokenSale(data).save();
            return res.send(this.successFormat({ message: "Your data has been added" })).status(200)
        }
        return res.status(400).send(checkStatus.error)
    }
    async checkAndUpdateBalance(details, customer, data) {
        let checkUser = await users.findOne({ _id: details.ieo_user_id });
        let asset = await assets.findOne({ _id: details.asset })
        let input = {
            "data": {
                "attributes": {
                    "user_id": checkUser.user_id,
                    "asset": [asset.asset_code]
                }
            }
        }
        let checkBalance = await apiService.matchingEngineRequest('post', 'balance/query', input, null, 'query');
        if (checkBalance.code == 200) {
            if (checkBalance.data.attributes[asset.asset_code].available <= data.amount) {
                return { status: false, error: this.errorMsgFormat({ 'message': 'Amount is greater than session supply' }) }
            }
            let checkOwnerUpdateBalance = await this.UpdateBalance(checkUser.user_id, data.amount, asset.asset_code)
            if (checkOwnerUpdateBalance.status) {
                let checkCustomer = await this.UpdateBalance(customer, data.amount, asset.asset_code, 'deposit');
                if (checkCustomer.status) {
                    return { status: true }
                }
                return { status: false, error: checkCustomer.error }
            }
            return { status: false, error: checkOwnerUpdateBalance.error }

        }

        return { status: false, error: checkBalance }

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



}
module.exports = new ieo()