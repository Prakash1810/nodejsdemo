const express = require('express');
const router = express.Router();
const users = require('../db/users');
const matching = require('../services/api');
const Controller = require('../core/controller');
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

router.post('/balance/history', auth, async (req, res) => {
    try {
        
         req.body.data.attributes.user_id = Number(req.user.user_id);
        await matching.matchingEngineRequest('post', 'balance/history', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/balance/query', auth, async (req, res) => {
    try {
      
       
        if(!req.body.data){
            req.body.data={
                attributes:{
                    user_id: Number(req.user.user_id)
                }
            }
        }
        else{
            req.body.data.attributes.user_id = Number(req.user.user_id);
        }
        await matching.matchingEngineRequest('post', 'balance/query', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

// router.patch('/balance/update', auth, async (req, res) => {
//     try {
//         req.body.data.attributes.user_id = Number(req.user.user_id);
//         await matching.matchingEngineRequest('patch', 'balance/update', req.body, res);
//     } catch (err) {
//         return res.status(500).send(controller.errorMsgFormat({
//             'message': err.message
//         }, 'order-matching', 500));
//     }
// })

//ORDER

router.post('/order/put-market', auth, async (req, res) => {
    try {
        let side ;
        let data =  req.body.data.attributes;
         req.body.data.attributes.user_id = Number(req.user.user_id);
         let check = await markets.findOne({market_name:data.market,is_active:true,disable_trade:false});
         let checkUser = await users.findOne({_id:req.user.user,trade:false});
         if(checkUser){
            return res.status(400).send(controller.errorMsgFormat({message:'user does not allow to trade'}));
         }
         if(!check){
             return res.status(400).send(controller.errorMsgFormat({message:'pair are not available'}));
         }
         
            if(data.q)
            {
                side = data.side == 2 ? "BUY" : "SELL";

                let input = 
                {
                    symbol:data.market,
                    side:side,
                    type:"MARKET",
                    quantity:data.amount,
                }
                await matching.binance(input,req.body.data.attributes.user_id);
            }
            else{
                 //delete q from request;
                delete data.q;
                let fee = await users.findOne({_id:req.user.user});
                req.body.data.attributes.takerFeeRate = fee.taker_fee
               
               await matching.matchingEngineRequest('post', 'order/put-market', req.body, res)
            }
           
       ;

    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/put-limit', auth, async (req, res) => {
    try {
        let side;
        let data = req.body.data.attributes;
         req.body.data.attributes.user_id = Number(req.user.user_id);
         let check = await markets.findOne({market_name:data.market,is_active:true,disable_trade:false});
         let checkUser = await users.findOne({_id:req.user.user,trade:false});
         if(checkUser){
            return res.status(400).send(controller.errorMsgFormat({message:'Trade is disabled for this account'}));
         }
         if(!check){
             return res.status(400).send(controller.errorMsgFormat({message:`The  market-${data.market} is inactive`}));
         }
         if(data.q)
         {
             side = data.side == 2 ? "BUY" : "SELL";

             let input = 
             {
                 symbol:data.market,
                 side:side,
                 type:"LIMIT",
                 quantity:data.amount,
                 price:data.pride
             }
             await matching.binance(input,req.body.data.attributes.user_id);
         }

         //delete q from request;
         delete data.q;
         let fee = await users.findOne({_id:req.user.user});
         req.body.data.attributes.takerFeeRate = fee.taker_fee;
         req.body.data.attributes.makerFeeRate = fee.maker_fee;
     await matching.matchingEngineRequest('post', 'order/put-limit', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/cancel', auth, async (req, res) => {
    try {
         req.body.data.attributes.user_id = Number(req.user.user_id);
        await matching.matchingEngineRequest('post', 'order/cancel', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.get('/order/cancel', auth, async (req, res) => {
    try {
            let user  = Number(req.user.user_id);
            let data = await orderCancel.find({user:user});
            let result = _.orderBy(data,['ctime'],['asc']);
            return res.status(200).send(controller.successFormat(result,user));
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

router.post('/order/pending', auth, async (req, res) => {
    try {
         req.body.data.attributes.user_id = Number(req.user.user_id);
        await matching.matchingEngineRequest('post', 'order/pending', req.body, res);
    } catch (err) {
        return res.status(500).send(controller.errorMsgFormat({
            'message': err.message
        }, 'order-matching', 500));
    }
})

router.post('/order/pending-detials',auth, async (req, res) => {
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

router.post('/order/finished', auth, async (req, res) => {
    try {
         req.body.data.attributes.user_id = Number(req.user.user_id);
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

router.post('/market/user-deals', auth, async (req, res) => {
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
})

module.exports = router;