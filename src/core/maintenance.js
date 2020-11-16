const Controller = require('../core/controller');
const { notice } = require('../db/maintenance');

class Maintenance extends Controller {

    async getAlleNotice(req, res) {
        try {
            let noticeList = await notice.find({ is_active: true }).select("-__v");
            return res.status(200).json(this.successFormat({ result: noticeList }));
        } catch (error) {
            return res.status(500).json(this.errorMsgFormat(error, 'maintenances', 500));
        }
    }

}

module.exports = new Maintenance;