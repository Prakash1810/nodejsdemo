const express = require('express');
const router = express.Router();
const users = require('../db/users');
const matching = require('../services/api');
const Controller = require('../core/controller');
const info = require('../middlewares/info');
const controller = new Controller;
const getFee = require("../db/matching-engine-config");
const markets = require('../db/market-list');
const auth = require('../middlewares/authentication');
const orderCancel = require('../db/order-cancel');
const _ = require('lodash');
//ASSET

router.get('/asset/list', async (req, res) => {
    try {
        await matching.matchingEngineGetRequest('asset/list', res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.get('/asset/summary', async (req, res) => {
    try {
        if (!req.query) {
            await matching.matchingEngineGetRequest('asset/summary', res);
        }
        else {
            await matching.matchingEngineQueryRequest('asset/summary', req.query, res)
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

//BALANCE

router.post('/balance/history', info, auth, async (req, res) => {
    try {

        req.body.data.attributes.user_id = Number(req.user.user_id);
        await matching.matchingEngineRequest('post', 'balance/history', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/balance/query', info, auth, async (req, res) => {
    try {
        if (!req.body.data) {
            req.body.data = {
                attributes: {
                    user_id: Number(req.user.user_id)
                }
            }
        }
        else {
            req.body.data.attributes.user_id = Number(req.user.user_id);
        }
        await matching.matchingEngineRequest('post', 'balance/query', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

//ORDER

router.post('/order/put-market', info, auth, async (req, res) => {
    try {
        await matching.order(req, res, 'market');
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
});

router.post('/order/put-limit', info, auth, async (req, res) => {
    try {
        await matching.order(req, res, 'limit');
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
});

router.post('/order/cancel', info, auth, async (req, res) => {
    try {
        req.body.data.attributes.user_id = Number(req.user.user_id);
        let data = req.body.data.attributes;
        let check = await markets.findOne({ market_name: data.market })
        let checkUser = await users.findOne({ _id: req.user.user, trade: false });
        if (checkUser) {
            return res.status(400).send(controller.errorMsgFormat({ message: 'Trade is disabled for this account' }));
        }
        if (check.active == false || check.disable_trade == true) {
            return res.status(400).send(controller.errorMsgFormat({ message: `The  market-${data.market} is inactive` }));
        }
        await matching.matchingEngineRequest('post', 'order/cancel', req.body, res, 'json', check);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.get('/order/cancel', info, auth, async (req, res) => {
    try {
        let user = Number(req.user.user_id);
        let data = await orderCancel.find({ user: user });
        let result = _.orderBy(data, ['ctime'], ['asc']);
        return res.status(200).send(controller.successFormat(result, user));
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

// router.post('/order/book', async (req, res) => {
//     try {
//         await matching.matchingEngineRequest('post', 'order/book', req.body, res);
//     } catch (err) {
//         return res.status(500).send(controller.errorMsgFormat({
//             'message': err.message
//         }, 'order-matching', 500));
//     }
// })

// router.post('/order/depth', async (req, res) => {
//     try {
//         await matching.matchingEngineRequest('post', 'order/depth', req.body, res);
//     } catch (err) {
//         return res.status(500).send(controller.errorMsgFormat({
//             'message': err.message
//         }, 'order-matching', 500));
//     }
// })

router.post('/order/pending', info, auth, async (req, res) => {
    try {
        req.body.data.attributes.user_id = Number(req.user.user_id);
        if (req.body.data.attributes.market == 'ALL') {
            let marketList = await markets.find(), pendingOrders = [], i = 0;
            while (i < marketList.length) {
                Object.assign(req.body.data.attributes, {
                    "user_id": req.user.user_id,
                    "market": marketList[i].market_name,
                    "offset": 0,
                    "limit": 100
                });
                let response = await matching.matchingEngineRequest('post', 'order/pending', req.body, res, 'list');
                if (!response.errors) {
                    let j = 0;
                    while (j < response.data.attributes.records.length) {
                        delete response.data.attributes.records[j].user;
                        pendingOrders.push(response.data.attributes.records[j]);
                        j++;
                    }
                }
                i++;
            }
            let sortedOrder = _.orderBy(pendingOrders, ['mtime'], ['desc']);
            return res.status(200).send(controller.successFormat({ records: sortedOrder }));
        } else {
            await matching.matchingEngineRequest('post', 'order/pending', req.body, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/pending-details', info, auth, async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/pending-details', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/deals', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/deals', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/finished', info, auth, async (req, res) => {
    try {
        req.body.data.attributes.user_id = Number(req.user.user_id);
        if (req.body.data.attributes.market == 'ALL') {
            let marketList = await markets.find(), finishedOrders = [], i = 0;
            while (i < marketList.length) {
                Object.assign(req.body.data.attributes, {
                    "user_id": req.user.user_id,
                    "market": marketList[i].market_name,
                    "start_time": req.body.data.attributes.start_time,
                    "end_time": req.body.data.attributes.end_time,
                    "offset": 0,
                    "limit": 100,
                    "side": 0
                });
                let response = await matching.matchingEngineRequest('post', 'order/finished', req.body, res, 'list');
                if (!response.errors) {
                    let j = 0;
                    while (j < response.data.attributes.records.length) {
                        delete response.data.attributes.records[j].user;
                        finishedOrders.push(response.data.attributes.records[j]);
                        j++;
                    }
                }
                i++;
            }
            let sortedOrder = _.orderBy(finishedOrders,['ftime'],['desc']);
            return res.status(200).send(controller.successFormat({ records: sortedOrder }));
        } else {
            await matching.matchingEngineRequest('post', 'order/finished', req.body, res);
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/finished-details', info, auth, async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/finished-details', req.body, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

//MARKET

router.get('/market/list', async (req, res) => {
    try {
        await matching.matchingEngineRequestForMarketList('market/list', req, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'api', 500));
    }
})

router.get('/market/summary', async (req, res) => {
    try {
        if (!req.query) {
            await matching.matchingEngineGetRequest('market/summary', res);
        }
        else {
            await matching.matchingEngineQueryRequest('market/summary', req.query, res)
        }
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'api', 500));
    }
})

router.post('/market/status', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'market/status', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }

})


router.post('/market/status-today', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'market/status-today', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/market/last', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'market/last', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/market/deals', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'market/deals', req.body, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/market/user-deals', info, auth, async (req, res) => {
    try {
        req.body.data.attributes.user_id = Number(req.user.user_id);
        await matching.matchingEngineRequest('post', 'market/user-deals', req.body, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/market/kline', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'market/kline', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
});

router.post('/all/orders/cancel', info, auth, async (req, res) => {
    try {
        await matching.allOrdersCancel(req, res, req.user.user_id, 'allCancel');
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
});

module.exports = router;