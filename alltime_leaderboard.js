let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
let db = require('./db');
let con;
let getCon = async function() {
	if (!con) {
		con = await db.getConnection();
	}

	return con;
}

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

// daily leaderboard on blockchain
module.exports.setAllTimeLeaderboard = async function(nftRush, data, nftRushOwner) {
	//sessionId, spentWallets, spentAmount, mintedWallets, mintedAmount)
	const gasPrice = await blockchain.web3.eth.getGasPrice();
	var gasEstimate = await nftRush.methods.announceAllTimeMintedWinners(data.session_id, data.minted_wallets, data.minted_amount).estimateGas({ from: nftRushOwner.address });

	let params = {
		from: nftRushOwner.address,
		gasPrice: gasPrice,
		gas: gasEstimate * 3
	};
	var result = await nftRush.methods.announceAllTimeMintedWinners(data.session_id, data.minted_wallets, data.minted_amount).send(params);

	await setAllTimeAnnounced(data.session_id);

	return 	result.transactionHash;
};

//////////////////////////////////////////////////////////

let getLastSession = async function() {
	let sql = "SELECT * FROM nft_rush_sessions ORDER BY id DESC LIMIT 1";
	let con = await getCon();
	return await new Promise(function(resolve, reject) {
		con.query(sql, function(err, res, _fields) {
			if (err) {
				reject(err);
			} else {
				resolve(res[0]);
			}
		});
	});
};

let setAllTimeAnnounced = async function(sessionId) {
	let sql = `UPDATE nft_rush_sessions SET all_time_announced = true WHERE id = '${sessionId}' `;
	let con = await getCon();
	return await new Promise(function(resolve, reject) {
		con.query(sql, function(err, res, _fields) {
			if (err) {
				reject(err);
			} else {
				resolve(res[0]);
			}
		});
	});
};

module.exports.calculateAllTimeWinners = async function() {
    let session = await getLastSession();
	// after session expiration, we can define announcement only for one time.
    if (!isActiveSession(session) && !session.all_time_announced) {
      	let minted = await getMintedWinners(session)

      	return {
			"session_id": session.id,
			"spent_amount": 0,
			"spent_wallets": [],
			"minted_amount": minted.amount,
			"minted_wallets": minted.wallets
		};
	}
};

let getMintedWinners = async function(session) {
	let leaderboard = await getMintedAllTime(session.id)

	let wallets = [];
	leaderboard.forEach(element => {
		wallets.push(element.wallet_address);
	});
	let amount = leaderboard.length;

	let placeholder = process.env.ADDRESS_1;

	for (var i=amount; i<10; i++) {
		wallets[i] = placeholder;
	}

	return {wallets: wallets, amount: leaderboard.length};
}

let isActiveSession = function(session) {
    if (!session) {
		return false;
	}

	let today = new Date();

	return session.end_time.getTime() >= today.getTime();
};

let getMintedAllTime = async function(sessionId) {
	let sql = `SELECT wallet_address, COUNT(nft_id) as amounts,updated_at FROM minted_leaderboards WHERE session_id = '${sessionId}' GROUP BY wallet_address ORDER BY COUNT(nft_id) DESC, MAX(updated_at) LIMIT 10 `;

	let con = await getCon();
	return await new Promise(function(resolve, reject) {
		con.query(sql, function(err, res, _fields) {
			if (err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
};
