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
const kafka = require('kafka-node');
const orderCancel = require('../db/order-cancel');
const fs = require('fs');
const moment = require('moment');
const _ = require('lodash');
const Redis = require('ioredis');
const device = require('../db/device-management');
const branca = require("branca")(config.get('encryption.realKey'));
const { AuthenticatedClient } = require("../helpers/AuthenticatedClient");
const Utils = require('../helpers/utils');
const utils = new Utils();
class Api extends Controller {

    async sendEmailNotification(data, res) {
        if (data.email_for !== 'registration' && data.email_for !== 'welcome') {

            if (!data.user_id) {
                return res.status(400).send(controller.errorMsgFormat({ "message": "User could not be found." }, 'users', 400));
            }
            if (data.email_for == 'wallet-withdraw') {
                data.code = helpers.encrypt(JSON.stringify(
                    {
                        user: data.user_id,
                        user_id: data.userId,
                        code: data.verification_code
                    }))
            }
        }

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

    async OkexHttp(input, req, res) {
        const timestamp = await utils.getTime();
        const authClient = new AuthenticatedClient(process.env.HTTPKEY, process.env.HTTPSECRET, process.env.PASSPHRASE, timestamp.epoch);

        let body = input;
        let response = await authClient.spot().postOrder(body);
        if (response.result) {
            if (input.type == 'market') {
                response.order_id = `OX:${response.order_id}`
                await this.addResponseInREDIS(response);
                return res.status(200).send(controller.successFormat({ 'message': "The Market order has been placed " }))
            } else {
                req.data.attributes['source'] = `OX-${response.order_id}`;
                response.order_id = `OX:${response.order_id}`
                await this.addResponseInREDIS(response);
                await this.matchingEngineRequest('post', 'order/put-limit', req, res);
            }

        }
        else {
            return res.status(500).send(controller.errorMsgFormat({
                'message': 'Something went wrong, Please try again'
            }, 'order-matching', 500));
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

    async authenticationInfo(req) {
        try {
            let jwtOptions = {
                issuer: config.get('secrete.issuer'),
                subject: 'Authentication',
                audience: config.get('secrete.domain'),
                expiresIn: config.get('secrete.infoToken')
            };

            let token = req.headers.info;
            const deviceInfo = await jwt.verify(token, config.get('secrete.infokey'), jwtOptions);
            const checkToken = await accesToken.findOne({ user: deviceInfo.info, is_deleted: true, info_token: token, type_for: "info-token" });
            if (checkToken) {
                throw error
            } else {
                let checkDevice = await device.findOne({
                    browser: deviceInfo.browser,
                    user: deviceInfo.info,
                    browser_version: deviceInfo.browser_version,
                    is_deleted: false,
                    region: deviceInfo.region,
                    city: deviceInfo.city,
                    os: deviceInfo.os
                })
                let checkActive = await users.findOne({ _id: deviceInfo.info, is_active: false });

                if (!checkDevice) {
                    res.status(401).json(controller.errorMsgFormat({
                        message: 'The device are browser that you are currently logged in has been removed from the device whitelist.'
                    }, 'user', 401));
                } else if (checkActive) {
                    await accesstoken.findOneAndUpdate({ user: checkActive.id, info_token: token, type_for: "info-token" }, { is_deleted: true });
                    res.status(401).json(controller.errorMsgFormat({
                        message: 'Your account has been disabled. Please contact support.'
                    }, 'user', 401));

                }
                else {
                    return { status: true }
                }
            }

        }

        catch (error) {
            return { status: false, result: "Authentication failed. Your request could not be authenticated." };
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
            const dataUser = await jwt.verify(token, config.get('secrete.key'), verifyOptions);
            const data = JSON.parse(branca.decode(dataUser.token));
            const isChecked = await accesToken.findOne({
                user: data.user, access_token: token, is_deleted: true, type_for: "token"
            })
            if (isChecked) {
                throw error;
            }
            else {
                return { status: true, result: data }
            }


        }
        catch (err) {
            return { status: false, result: "Authentication failed. Your request could not be authenticated." };
        }

    }
    async matchingEngineRequestForMarketList(path, req, res, type = 'withoutAdd') {

        if (req.headers.authorization && req.headers.info) {
            let markets = [];
            let isInfo = await this.authenticationInfo(req);
            let isChecked = await this.authentication(req);
            if (!isInfo.status || !isChecked.status) {
                return res.status(401).json(controller.errorMsgFormat({
                    message: "Authentication failed. Your request could not be authenticated."
                }, 'user', 401));
            }
            let getMarket = await market.find({});
            if (getMarket.length == 0) {
                return res.status(404).send(controller.errorMsgFormat({
                    'message': "Market could not be found."
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
                for (let k = 0; k < data.length; k++) {
                    for (let j = 0; j < getMarket.length; j++) {
                        if (data[k].name == getMarket[j].market_name) {
                            data[k].q = getMarket[j].q
                        }
                    }
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
                    for (let j = 0; j < getMarket.length; j++) {
                        if (data[k].name == getMarket[j].market_name) {
                            data[k].q = getMarket[j].q
                        }
                    }
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
            let response = [];
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
                response.push({ [pairs[i]]: markets })
            }
            return res.status(200).send(controller.successFormat([response, market_name], result.result.id))
        } catch (err) {
            return res.status(result.errorCode).send(controller.errorMsgFormat({
                'message': err.message
            }, 'order-matching'));
        }

    }

    async matchingEngineRequest(method, path, input, res, type = 'json', liquidity) {
        let source, data = null
        if (path == 'order/cancel') {
            data = input.data.attributes;
            if (!data.source) {
                return res.status(500).send(controller.errorMsgFormat({
                    'message': "Source must be provide"
                }, 'order-matching', 500));
            }

            source = data.source
            delete input.data.attributes.source
        }
        const axiosResponse = await axios[method](
            `${process.env.MATCHINGENGINE}/api/${process.env.MATCHINGENGINE_VERSION}/${path}`, input)
        const result = axiosResponse.data;
        if (result.status) {
            let value = result.result.result;
            if (type === 'json') {

                if (path == 'order/cancel') {
                    await new orderCancel(value).save();
                    if (liquidity.q) {
                        let body
                        const timestamp = await utils.getTime();
                        const authClient = new AuthenticatedClient(process.env.HTTPKEY, process.env.HTTPSECRET, process.env.PASSPHRASE, timestamp.epoch);
                        let pair = data.market
                        if (pair.substr(pair.length - 4) == 'USDT') {
                            body = pair.slice(0, pair.length - 4) + '-' + pair.slice(pair.length - 4);
                        }
                        else {
                            body = pair.slice(0, pair.length - 3) + '-' + pair.slice(pair.length - 3);
                        }
                        let response = await authClient.spot().postCancelOrder(source.substr(source.indexOf('-') + 1), { "instrument_id": body.toLowerCase() });
                        console.log("Response:", response);
                        if (response[body.toLowerCase()][0].result) {
                            response[body.toLowerCase()][0].order_id = `OX:${response[body.toLowerCase()][0].order_id}`
                            await this.addResponseInREDIS(response[body.toLowerCase()][0], "cancel");
                            return res.status(200).send(controller.successFormat({ 'message': "Your order can be cancel" }));
                        }
                        else {
                            return res.status(500).send(controller.errorMsgFormat({
                                'message': 'Something went wrong, Please try again'
                            }, 'order-matching', 500));
                        }
                    }
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

    async addResponseInREDIS(response, type = 'nonCancel') {
        // var client = redis.createClient('6379','127.0.0.1');

        // client.on('connect', function () {
        //     console.log("...........Redis Connected..............")
        //     client.set(response.order_id, response, redis.print);
        //     // return { status:true, result:'Add data Redis' };
        //     let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : success : ${response.orderId} : ${response.user_id} : ${JSON.stringify(response)}`
        //     fs.appendFile('redisSuccess.txt', `\n${fileConent} `, function (err) {
        //         if (err)
        //             console.log("Error:", err);
        //     });
        // }); 

        // client.on('error', function (err) {
        //     let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : error : ${response.orderId} :${response.user_id} : ${err}`
        //     fs.appendFile('redisError.txt', `\n${fileConent} `, function (err) {
        //         if (err)
        //             console.log("Error:", err);
        //     });
        //     //return { status:false, error:'Something went wrong' };
        // });

        const redis = new Redis.Cluster([
            {
                port: process.env.REDIS_PORT,
                host: process.env.REDIS_HOST
            }
        ]);
        redis.rpush(response.order_id, JSON.stringify(response));
        redis.rpush(response.order_id, type == 'cancel' ? JSON.stringify({ cancel: true }) : JSON.stringify({ cancel: false }));
        redis.on('error', (err) => {
            console.log(err);
        })
        let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : success : ${response.order_id} : ${response.client_oid} : ${JSON.stringify(response)}`
        fs.appendFile('redisSuccess.txt', `\n${fileConent} `, function (err) {
            if (err)
                console.log("Error:", err);
        });


    }

    async DisposableEmailAPI(data) {

        let axiosResponse = await axios.get(`https://block-temporary-email.com/check/domain/${data}`)
        if (axiosResponse.data) {
            return axiosResponse.data
        }
    }

    // async addResponseInKAFKA(jsonData, market) {
    //     let Producer = kafka.Producer,
    //         Client = new kafka.KafkaClient({
    //             kafkaHost: process.env.KAFKA
    //         }),
    //         producer = new Producer(Client, {
    //             requireAcks: 1
    //         });

    //     producer.on('ready', async function () {
    //         let response = await producer.send([{
    //             topic: `${config.get('liquidity.topic')}${market}`,
    //             messages: JSON.stringify(jsonData),
    //         }]);
    //         if (response) {

    //             let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : success : ${jsonData.order_id} : ${jsonData.user_id} : ${JSON.stringify(jsonData)}`
    //             fs.appendFile('kafaSuccess.txt', `\n${fileConent} `, function (err) {
    //                 if (err)
    //                     console.log("Error:", err);
    //             });
    //             //return { status :true }
    //         }
    //         else {
    //             let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : error : ${jsonData.order_id} :${jsonData.user_id} : ${JSON.stringify(jsonData)}`
    //             fs.appendFile('kafkaError.txt', `\n${fileConent} `, function (err) {
    //                 if (err)
    //                     console.log("Error:", err);
    //             });
    //             //return { status : false , error : response.message }
    //         }
    //     });

    //     producer.on('error', function (err) {
    //         let fileConent = `(${moment().format('YYYY-MM-DD HH:mm:ss')}) : error : ${jsonData.order_id} :${jsonData.user_id} : ${err}`
    //         fs.appendFile('kafkaError.txt', `\n${fileConent} `, function (err) {
    //             if (err)
    //                 console.log("Error:", err);
    //         });
    //         //return { status : false , error : response.message }
    //     });

    // }

}

module.exports = new Api();