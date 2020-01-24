const users = require('../db/users');
const settings = require('../db/settings');
const referralHistory = require('../db/referral-history');
const apiServices = require('../services/api');
const aduits = require('../db/auditlog-history');


async function changeReferrerCode() {
    let i = 0;
    let data = await aduits.find({ path: { $regex: new RegExp('/user/registration') } });
    console.log("Count:", data.length);
    while (i < data.length) {
        let attributes = data[i].request.data.attributes;
        let code = attributes.referrer_code;
        let email = attributes.email
        let user = await users.findOne({ email: email }).select('email referrer_code ');

        if (user && code != undefined && code != '') {
            console.log("Code:", code)
            await users.findOneAndUpdate({ email: user.email }, { referrer_code: code });
        }
        i++;
    }
}

async function changeActive() {
    let i = 0;
    let check = await users.find({ kyc_verified: true });
    while (i < check.length) {
        check[i].kyc_statistics = "APPROVE"
        check[i].save();
        console.log("User:", check[i]);
        i++;
    }

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
        payloads = Object.assign({}, {
            "user_id": user,
            "asset": "BDX",
            "business": "deposit",
            "business_id": date.valueOf(),
            "change": checkSetting.amount,
            "detial": {}
        });
        await apiServices.matchingEngineRequest('patch', 'balance/update', this.requestDataFormat(payloads), res, 'data');

    }

    return payloads.change

}
changeReferrerCode()
//changeActive()
//uploadBalance()
