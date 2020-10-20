class Controller {

    errorMsgFormat(error, type = 'users', code = 400) {
        return {
            "code": code,
            "errors": true,
            "data": {
                "type": type,
                "attributes": error
            }
        };
    }

    errorFormat(error) {
        let errors = {};
        if (error.details) {
            error.details.forEach((detail) => {
                errors[detail.path] = detail.message;

            });
        } else {
            errors = error;
        }
        return this.errorMsgFormat({ message: errors }, 'users', 400);
    }

    successFormat(res, id = null, type = 'users', code = 200) {
        return {
            "code": code,
            "errors": false,
            "data": {
                "id": id,
                "type": type,
                "attributes": res
            }
        };
    }

    requestDataFormat(data) {
        return {
            "lang": "en",
            "data": {
                "attributes": data
            }
        };
    }

    responseData(hash, amount, address, status, user_id, memo, asset, height,time) {
        let data = {
            tx_hash: `${height}/${hash}`,
            txtime: time,
            amount: amount,
            address: address,
            status: status,
            date: new Date(),
            user_id: user_id,
            user: memo,
            asset: asset,
            final_amount: amount,
            type: '2',
            height: height,
            confirmation: 1
        }
        return data
    }

    redisPayload(user_id, transaction_id, to, amount, height, txtime, user, asset) {
        let payload = {
            UserID: user_id,
            Txid: transaction_id,
            Address: to,
            Amount: amount,
            Height: height,
            Txtime: txtime,
            UserOBJ: user,
            AssetOBJ: asset,
            FundMovement: 1
        }
        return payload
    }
  

}

module.exports = Controller;