
const device = require('../db/device-management');
const accountActive = require('../db/account-active');
module.exports = async (req, res, next) => {
    try 
    {
        let data = req.body.data.attributes;
        let checkedDevice = await device.findOne({
            browser:data.browser,
            browser_version:data.browser_version,
            is_deleted:true,
            ip:data.ip
        })
        if(checkedDevice)
        {
            throw new Error("Device Not Found");
        }
    }
    catch(err)
    {
        return res.status(401).json(controller.errorMsgFormat({
            message: "Invalid authentication"
        }));
    }
    
}