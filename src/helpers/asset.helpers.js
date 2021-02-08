const Controller = require('../core/controller');
const assets = require('../db/assets');


class assetHelper extends Controller {

    async assetTradeChecker(pair) {
        let data;
        if (pair.substr(pair.length - 4) == 'USDT') {
            data = pair.slice(0, pair.length - 4);
        }
        else {
            data = pair.slice(0, pair.length - 3);
        }
        let checkTrade = await assets.findOne({ asset_code: data });
        return checkTrade.can_trade;
    }

}

module.exports = new assetHelper();