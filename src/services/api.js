const axios = require('axios');
const jwt = require('jsonwebtoken');
const Controller = require('../core/controller');
const helpers = require('../helpers/helper.functions');
const assets = require('../db/assets');
const users = require('../db/users');
const accesToken = require('../db/management-token');
const config = require('config');
const controller = new Controller;
const market = require('../db/market-list');
const favourite = require('../db/favourite-user-market');
const Binance = require('binance-api-node').default;
const redis = require('redis');
const kafka = require('kafka-node');
const orderCancel = require('../db/order-cancel');
const fs = require('fs');
const moment = require('moment');
const _ = require('lodash');
class Api extends Controller {

    async sendEmailNotification(data) {

        if (data.email_for !== 'registration') {
            
            
               let disableData = JSON.stringify({
                    'user_id': data.user_id,
                    'is_active': false
                });

            
            if(data.email_for == 'wallet-withdraw')
            {
                data.code = helpers.encrypt(JSON.stringify(
                    {
                        user:data.user_id,
                        user_id:data.userId,
                        code:data.verification_code
                    }))
            }
            data.disable_code = helpers.encrypt(disableData);

            let user = await users.findById(data.user_id);
            data.to_email = user.email
            data.anti_spoofing_code = (user.anti_spoofing) ? user.anti_spoofing_code : false;

        }
        console.log("Data:", data);
        axios.post(`${process.env.NOTIFICATION}/api/${process.env.NOTIFICATION_VERSION}/email-notification`, this.requestDataFormat(data))
            .then((res) => {
                console.log(res.data);
            })
            .catch((err) => {
                throw (err.message)
            });
    }


    async initAddressCreation(user) {
        try {
            let results = await assets.find({
                is_default: true
            });
            console.log('Result:', results);
            results.forEach((result) => {
                let data = {
                    "coin": result.asset_code,
                    "user_id": user.user_id,
                    "user": user._id,
                    "asset": result._id
                };
                return this.axiosAPI(data)
            });

        } catch (err) {
            throw (err.message)
        }
    }

    axiosAPI(data) {
        console.log("Dataaa:", data);
        axios.post(
            `${process.env.WALLETAPI}/api/${process.env.WALLETAPI_VERSION}/address/generate`, this.requestDataFormat(data)
        ).then(axiosResponse => {
            if (axiosResponse.data !== undefined) {
                return axiosResponse.data;
            }
        }).catch(axiosError => {
            if (axiosError.response !== undefined) throw (axiosError.response)
        });
    }

    async binance(input, user_id) {
        const client = Binance({
            apiKey: process.env.APIKEY,
            apiSecret: process.env.SECRETKEY
        })
        let response = await client.order(input);
        response.user_id = user_id;
        console.log('Response:', response);
        if (input.type == 'MARKET') {
            this.addResponseInKAFKA(response, input.symbol);
        } else {
            this.addResponseInREDIS(response);
        }

    }
    async matchingEngineGetRequest(path, res) {
        let axiosResponse = await axios['get'](
            `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}`);
        let result = axiosResponse.data;
        if (result.status) {
            return res.status(200).send(controller.successFormat(result.result.result, result.result.id))
        } else {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': result.error
            }, 'order-matching', result.errorCode));
        }
    }

    async matchingEngineQueryRequest(path, data, res) {
        let value = Object.values(data);
        let axiosResponse = await axios.get(
            `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}?${Object.keys(data)}=${value[0]}`);
        let result = axiosResponse.data;
        if (result.status) {
            return res.status(200).send(controller.successFormat(result.result.result, result.result.id))
        } else {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': result.error
            }, 'order-matching', result.errorCode));
        }
    }
    async authentication(req) {
        try {
            let verifyOptions = {
                issuer: config.get('secrete.issuer'),
                subject: 'Authentication',
                audience: config.get('secrete.domain'),
                expiresIn: config.get('secrete.expiry')
            };
            const token = req.headers.authorization;
            const data = await jwt.verify(token, config.get('secrete.key'), verifyOptions);
            const isChecked = await accesToken.findOne({
                user: data.user, access_token: token, is_deleted: true
            })
            if (isChecked) {
                throw error;
            } else {
                let isActive = await users.findOne({ _id: data.user, is_active: false })
                if (isActive) {
                    throw error;
                }
                else {
                    return { status: true, result: data }
                }

            }
        }
        catch (err) {
            return { status: false, result: "Invaild Authentication" };
        }

    }
    async matchingEngineRequestForMarketList(path, req, res, type = 'withoutAdd') {

        if (req.headers.authorization) {
            let markets = [];
            let isChecked = await this.authentication(req);
            if (!isChecked.status) {
                return res.status(401).json(controller.errorMsgFormat({
                    message: "Invalid authentication"
                }), 'user', 401);
            }
            let getMarket = await market.find({});
            if (getMarket.length == 0) {
                return res.status(404).send(controller.errorMsgFormat({
                    'message': "No Data Found"
                }, 'users', 404));
            }
            _.map(getMarket, async function (market) {
                let checkedFavorite = await favourite.findOne({
                    user: isChecked.result.user, market: {
                        $in: [
                            market._id
                        ]
                    }
                });
                if (checkedFavorite) {
                    markets.push(market.market_name);
                }

            })
            let axiosResponse = await axios.get(
                `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}`)
            const result = axiosResponse.data;
            let data = result.result.result;
            if (result.status) {
                _.map(markets, function (noMarkets) {
                    _.map(data, function (res) {
                        if (res.name === noMarkets) {
                            res.is_favourite = true;
                        }
                    })
                })

                //add q in response 
                for (let k = 0; k < getMarket.length; k++) {
                    data[k].q = getMarket[k].q;
                }
                await this.marketPairs(data, result, res);
            }
            else {
                return res.status(result.errorCode).send(controller.errorMsgFormat({
                    'message': result.error
                }, 'order-matching', result.errorCode));
            }

        }
        else {
            let getMarket = await market.find({});
            let axiosResponse = await axios['get'](
                `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}`);
            let result = axiosResponse.data;

            if (result.status) {
                let data = result.result.result;
                if (type == 'withAdd') {
                    return { status: true, result: data };
                }
                for (let k = 0; k < data.length; k++) {
                    data[k].q = getMarket[k].q
                }
                await this.marketPairs(data, result, res);
            } else {
                return res.status(result.errorCode).send(controller.errorMsgFormat({
                    'message': result.error
                }, 'order-matching', result.errorCode));
            }
        }


    }

    //Collect ot market pairs
    async marketPairs(data, result, res) {
        try {
            let j = 0;
            let isCheck = await assets.find({});
            while (j < data.length) {
                _.map(isCheck, function (asset) {
                    if (asset.asset_code == data[j].stock) {
                        if (asset.delist) {
                            data.splice(j, 1);
                        }
                    }
                });
                j++;
            }
            let repsonse = [];
            let pairs = [];
            let market_name = []
            let pair = await _.unionBy(data, 'money');
            await _.map(pair, async function (uniquePair) {
                pairs.push(uniquePair.money);

            });
            _.map(data, function (nofMarkets) {
                market_name.push(nofMarkets.name);
            })
            console.log("Market Name:", market_name);
            for (var i = 0; i < pairs.length; i++) {
                let markets = [];
                _.map(data, function (result) {
                    if (pairs[i] == result.money) {
                        markets.push(result);
                    }

                })
                repsonse.push({ [pairs[i]]: markets })
            }
            return res.status(200).send(controller.successFormat([repsonse, market_name], result.result.id))
        } catch (err) {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': err.message
            }, 'order-matching'));
        }

    }

    async matchingEngineRequest(method, path, data, res, type = 'json') {
        console.log("data:", data);
        const axiosResponse = await axios[method](
            `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}`, data)
        const result = axiosResponse.data;

        if (result.status) {
            let value = result.result.result;
            if (type === 'json') {

                if (path == 'order/cancel') {
                    await new orderCancel(value).save();
                }
                return res.status(200).send(controller.successFormat(value, result.result.id));
            } else {
                return controller.successFormat(value, result.result.id);
            }
        } else {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': result.error
            }, 'order-matching', result.errorCode));
        }
    }

    async marketPrice(assetsName, convertTo = 'usd,btc') {
        return await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${assetsName}&vs_currencies=${convertTo}`);
    }

    async addResponseInREDIS(response) {

        var client = redis.createClient(process.env.REDIS_HOST, process.env.REDIS_PORT);

        client.on('connect', function () {
            client.set(response.orderId, response, redis.print);
            // return { status:true, result:'Add data Redis' };
            let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : success : ${response.orderId} : ${response.user_id} : ${response}`
            fs.appendFile('/var/log/coreapi/redisSuccess.txt', `\n${fileConent} `, function (err) {
                if (err)
                    console.log("Error:", err);
            });
        });

        client.on('error', function (err) {
            let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : error : ${response.orderId} :${response.user_id} : ${err}`
            fs.appendFile('redisError.txt', `\n${fileConent} `, function (err) {
                if (err)
                    console.log("Error:", err);
            });
            //return { status:false, error:'Something went wrong' };
        });


    }

    async addResponseInKAFKA(jsonData, market) {
        let Producer = kafka.Producer,
            Client = new kafka.KafkaClient({
                kafkaHost: process.env.KAFKA
            }),
            producer = new Producer(Client, {
                requireAcks: 1
            });

        producer.on('ready', async function () {
            let response = await producer.send([{
                topic: `${config.get('topic')}${market}`,
                messages: JSON.stringify(jsonData),
            }]);
            if (response) {

                let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : success : ${jsonData.orderId} : ${jsonData.user_id} : ${jsonData}`
                fs.appendFile('kafaSuccess.txt', `\n${fileConent} `, function (err) {
                    if (err)
                        console.log("Error:", err);
                });
                //return { status :true }
            }
            else {
                let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : error : ${jsonData.orderId} :${jsonData.user_id} : ${jsonData}`
                fs.appendFile('kafkaError.txt', `\n${fileConent} `, function (err) {
                    if (err)
                        console.log("Error:", err);
                });
                //return { status : false , error : response.message }
            }
        });

        producer.on('error', function (err) {
            let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : error : ${jsonData.orderId} :${jsonData.user_id} : ${err}`
            fs.appendFile('kafkaError.txt', `\n${fileConent} `, function (err) {
                if (err)
                    console.log("Error:", err);
            });
            //return { status : false , error : response.message }
        });

    }
}

module.exports = new Api();