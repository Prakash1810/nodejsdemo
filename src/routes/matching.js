const express = require('express');
const router = express.Router();
const matching = require('../services/api');
const Controller = require('../core/controller');
const controller = new Controller;

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

router.post('/balance/history', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'balance/history', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/balance/query', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'balance/query', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.patch('/balance/update', async (req, res) => {
    try {
        await matching.matchingEngineRequest('patch', 'balance/update', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

//ORDER

router.post('/order/put-market', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/put-market', req.body, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/put-limit', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/put-limit', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/cancel', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/cancel', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/book', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/book', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/depth', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/depth', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/pending', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/pending', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/pending-detials', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/pending-detials', req.body, res);
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

router.post('/order/finished', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/finished', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/finished-detials', async (req, res) => {
    try {
        await matching.matchingEngineRequest('post', 'order/finished-detials', req.body, res);

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

//MARKET

router.get('/market/list', async (req, res) => {
    try {
        await matching.matchingEngineGetRequest('market/list', res);
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

router.post('/market/user-deals', async (req, res) => {
    try {
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
})

module.exports = router;