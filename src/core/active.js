const users = require('../db/users');
const settings = require('../db/settings');
const referralHistory = require('../db/referral-history');
const apiServices = require('../services/api');

async function changeActive() {

    let check = await users.find({ kyc_verified: true });
    check.kyc_statistics = "APPROVE"
    check.save();
    console.log("User:", check);
}

async function uploadBalance() {
    let checkUser = await users.find({ kyc_verified: true });
    await updateBalance(checkUser.user_id, checkUser._id, res, 'kyc_verified_reward');
    let checkReferrerCode = await users.findOne({ referral_code: checkUser.referrer_code });
    if (checkReferrerCode) {
        let amount = await updateBalance(checkReferrerCode.user_id, checkReferrerCode._id, res, 'referrer_reward');
        await new referralHistory({
            user_id: checkUser._id,
            referrer_code: checkReferrerCode.referrer_code,
            amount: amount,
            created_date: moment().format('YYYY-MM-DD HH:mm:ss')
        }).save()
    }
}

async function updateBalance(user, userId, res, type) {
    let payloads;
    let checkSetting = await settings.findOne({ type: type });
    let date = new Date();
    if (checkSetting) {
        payloads = {
            "user_id": user,
            "asset": "BDX",
            "business": "deposit",
            "business_id":  date.valueOf(),
            "change": checkSetting.amount,
            "detial": {}
        }
        await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');
        let serviceData = {
            "subject": ` ${payloads.asset} - Deposit Confirmation`,
            "email_for": "deposit-notification",
            "amt": payloads.change,
            "coin": payloads.asset,
            "user_id": userId

        };
        await apiServices.sendEmailNotification(serviceData, res);
    }

    return payloads.change

}

changeActive()
uploadBalance()