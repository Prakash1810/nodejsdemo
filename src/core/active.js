

async function changeActive(){
    const users = require('../db/users');
    let check = await users.find({kyc_verified:true});
    check.kyc_statistics = "APPROVE"
    check.save();
    console.log("User:",check);
}

changeActive()