let eventLog = require('./event_log');
let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
const schedule = require('node-schedule');

// account
blockchain.addAccount(process.env.ACCOUNT_1);


const commandLineArgs = require('command-line-args')
const optionDefinitions = [
    { name: 'fromBlock', alias: 'f', type: String },
    { name: 'toBlock', alias: 't', type: String }
];

const options = commandLineArgs(optionDefinitions);

/**
 * For test purpose, starts a game session
 */
let sync = async function(callback) {
    let nftBrawlAddress = process.env.NFT_RUSH_ADDRESS;
    let sessionId = process.env.NFT_RUSH_SESSION_ID;

    eventLog.init(blockchain.web3, nftBrawlAddress);

    //let nftBrawl = await NftBrawl.at(nftBrawlAddress);


    let toBlock = 12190741;
    let fromBlock = 12189315;

    if (options.fromBlock) {
        if (options.fromBlock !== 'latest') {
            fromBlock = parseInt(options.fromBlock);
        } else {
            fromBlock = options.fromBlock;
        }
    } 
    
    if (options.toBlock) {
        if (options.toBlock !== 'latest') {
            toBlock = parseInt(options.toBlock);
        } else {
            toBlock = options.toBlock;
        }
    }

    //let session = await nftBrawl.sessions(sessionId);

    ///////////////////////////////////////////////////////////////////
    // write on db the smartcontract events of profit circus
    await logEvents(sessionId, fromBlock, toBlock);

    console.log("Everything is checked!");
};

let logEvents = async function(sessionId, fromBlock, toBlock) {
    if (fromBlock == 'latest' || toBlock == 'latest') {
        await eventLog.logSpents(fromBlock, toBlock, sessionId);
        await eventLog.logMints(fromBlock, toBlock, sessionId);
        return;
    }
    // offset is a range between from block to block
    // bsc allows 5000 only
    let offset = 5000;
    // milliseconds. just to make not pressure the bsc node.
    let delay = 2000;

    for (var i = fromBlock; i <= toBlock; i+=offset) {
        let partEnd = i+offset;

        console.log(`From: ${i} to: ${partEnd}`);
        
        // event logs from other session id than ${sessionId} are skipped
        await eventLog.logSpents(i, partEnd, sessionId);
        await eventLog.logMints(i, partEnd, sessionId);

        await new Promise(r => setTimeout(r, delay));
    }

    return true;
};

schedule.scheduleJob('* * * * *', sync);