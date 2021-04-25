// please set the following variables by calling init() function
let web3 = null;
let contractAddress = null;

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

let convertToMysqlFormat = function(date) {
    return date.getUTCFullYear() + "-" + twoDigits(1 + date.getUTCMonth()) + "-" + twoDigits(date.getUTCDate()) + " " + twoDigits(date.getUTCHours()) + ":" + twoDigits(date.getUTCMinutes()) + ":" + twoDigits(date.getUTCSeconds());
};  



//////////////////////////////////////////////////////////////////////////////
// 
//  deposit event tracking
//
//////////////////////////////////////////////////////////////////////////////

let decomposeDeposit =  async function(event) {
    nonIndexed = web3.eth.abi.decodeParameters(['uint256', 'uint256', 'uint256'], event.data);

    let walletAddress = ("0x" + event.topics[1].substr(26)).toLowerCase();
    let sessionId = parseInt(nonIndexed[0]);
    let nftId = parseInt(nonIndexed[1]);
    let slotId = parrseInt(nonIndexed[2]);
    let blockNumber = await web3.eth.getBlock(event.blockNumber);

    return {
        txid: event.transactionHash.toLowerCase(),
        sessionId: sessionId,
        walletAddress: walletAddress,
        blockNumber: blockNumber,
        slotId: slotId,
        nftId: nftId
    };
};

let isDepositLoggedOnDb = async function(txid) {
    let sql = `SELECT wallet_address FROM spent_leaderboards WHERE txid = '${txid}' `;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                reject(false);
            } 
            else {
                let amount = res.length;
                
                resolve(amount > 0);
            }
        });
    });
}

let logDepositOnDb = async function(params) {
    let sql = `INSERT INTO nft_staking_deposits (session_id, wallet_address,
        nft_id, slot_id, block_number, txid) VALUES (
        '${params.sessionId}',
        '${params.walletAddress}',
        '${params.nftId}',
        '${params.slotId}',
        '${params.blockNumber}',
        '${params.txid}')`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

let logDeposit = async function(fromBlock, toBlock, sessionId) {
    let topic = "0x91ede45f04a37a7c170f5c1207df3b6bc748dc1e04ad5e917a241d0f52feada3";

    console.log("Checking deposits...")

    let events = await web3.eth.getPastLogs({
        address: contractAddress,
        topics: [topic],
        fromBlock: fromBlock,
        toBlock: toBlock
    })
    .catch(e => {
        console.log("Found an error");
        console.log(e);
    })

    console.log(`    Found ${events.length} events of Deposit!`);
    for (var i = 0; i<events.length; i++) {
        let event = events[i];

        let params = await decomposeDeposit(event);

        if (params.sessionId != sessionId) {
            continue;
        }

	    console.log(params);

        //let logged = await isSpentLoggedOnDb(params.txid);
        //if (!logged) {
        //    await logSpentOnDb(params);
        //}
    }
}

//////////////////////////////////////////////////////////////////////////////
//
// Minted event tracking
//
//////////////////////////////////////////////////////////////////////////////

let decomposeMint = async function(event) {
    //    event Minted(address indexed owner, uint256 sessionId, uint256 nftId);
    nonIndexed = web3.eth.abi.decodeParameters(['uint256', 'uint256'], event.data);

    let blockInfo = await web3.eth.getBlock(event.blockNumber);

    return {
        txid: event.transactionHash.toLowerCase(),
        walletAddress: ("0x" + event.topics[1].substr(26)).toLowerCase(),
        sessionId: parseInt(nonIndexed[0]),
        nftId: parseInt(nonIndexed[1]),
        dateTime: new Date(blockInfo.timestamp*1000)
    }
};

let isMintLoggedOnDb = async function(nftId) {
    let sql = `SELECT wallet_address FROM minted_leaderboards WHERE nft_id = '${nftId}' `;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                console.error(err);
                reject(false);
            } else {
                let amount = res.length;

                resolve(amount > 0);
            }
        });
    });
}

let logMintOnDb = async function(params) {
    let sql = `INSERT INTO minted_leaderboards (session_id, wallet_address, date_time, nft_id) VALUES 
    ('${params.sessionId}', '${params.walletAddress}', '${params.dateTime.toMysqlFormat()}', '${params.nftId}')`;

    let con = await getCon();

    return await new Promise(function(resolve, reject) {
        con.query(sql, function(err, res, _fields) {
            if (err) {
                console.log(err);
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
};

let logMints = async function(fromBlock, toBlock, sessionId) {
    // Claimed(address indexed stakingToken, address indexed owner, uint256 sessionId, uint256 amount, uint256 claimedTime);
    let withdrawnTopic = "0x25b428dfde728ccfaddad7e29e4ac23c24ed7fd1a6e3e3f91894a9a073f5dfff";

    let events = await web3.eth.getPastLogs({
        address: contractAddress,
        topics: [withdrawnTopic],
        fromBlock: fromBlock,
        toBlock: toBlock
    })

    console.log(`    Found ${events.length} events of Minted nfts!`);
    for (var i = 0; i<events.length; i++) {
        let event = events[i];

        let params = await decomposeMint(event);

        if (params.sessionId != sessionId) {
            continue;
        }

        let logged = await isMintLoggedOnDb(params.nftId);
        if (!logged) {
            await logMintOnDb(params);
        } 
    }
}


//////////////////////////////////////////////////////////////////////////////

module.exports = {
    init: (_web3, _contractAddress) => { web3 = _web3; contractAddress = _contractAddress; },
    logDeposit: logDeposit
}
