const blurt = require('@blurtfoundation/blurtjs');

blurt.api.getAccountHistory("beldex-hot", -1, 100, function(err, result) {
    const transfers = result.filter(tx => tx[1].op[0] === 'transfer');
    transfers.forEach((tx) => {
      const transfer = tx[1].op[1];
      console.log(transfer);
    });
  });