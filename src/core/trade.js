const Controller = require('./controller');
const controller = new Controller;
const MatchingEngineFee = require('../db/matching-engine-config')

const trade = () => {

    return {

        async getTakeAndMakeFee(req, res) {
            try {
                let takerFee = await MatchingEngineFee.findOne({ config: 'takerFeeRate' });
                let makerFee = await MatchingEngineFee.findOne({ config: 'makerFeeRate' });
                return res.status(200).send(controller.successFormat(
                    { takerFee: takerFee.value, makerFee: makerFee.value }, null, 'trade'));
            } catch (error) {
                return res.status(500).send(controller.errorMsgFormat({ message: error.message }, 'trade', 500));
            }
        }
        
    }
};


module.exports = trade();