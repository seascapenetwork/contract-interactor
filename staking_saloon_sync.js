/**
 * Sync the database with staking saloon contract.
 * 
 * Requires several configurations to pass as environment variables:
 * 
 *     ACCOUNT_1 - privatekey without 0x prefix, could be any account.
 *     STAKING_SALOON_ADDRESS - a smartcontract address
 *     STAKING_SALOON_SESSION_ID - a session id that we are listenig too.
 * 
 *     REMOTE_HTTP - a url of rpc endpoint of blockchain node.
 * 
 *     DATABASE_HOST - a url of mysql database host
 *     DATABASE_USERNAME - a database name
 *     DATABASE_PASSWORD - password to access to database
 *     DATABASE_NAME - a user name to access to database
 * 
 * Usage:
 * 
 * >>  node staking_saloon_sync.js --fromBlock=<block number|latest>  --toBlock=<block number|latest>
 */
let eventLog = require('./staking_saloon_event_log');
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

let syncJob = null;

/**
 * For test purpose, starts a game session
 */
let sync = async function(callback) {
    let stakingSaloonAddress = process.env.STAKING_SALOON_ADDRESS;
    let sessionId = process.env.STAKING_SALOON_SESSION_ID;

    eventLog.init(blockchain.web3, stakingSaloonAddress);

    let toBlock = 'latest';
    let fromBlock = 'latest';

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

    ///////////////////////////////////////////////////////////////////
    // write on db the smartcontract events of profit circus
    await logEvents(sessionId, fromBlock, toBlock);

    console.log("Everything is checked!");
};

let logEvents = async function(sessionId, fromBlock, toBlock) {
    if (fromBlock == 'latest' || toBlock == 'latest') {
        await eventLog.logDeposit(fromBlock, toBlock, sessionId);
        //await eventLog.logClaim(fromBlock, toBlock, sessionId);
        return;
    }

    // offset is a range between from block and to block
    // bsc allows 5000 only
    let offset = 5000;
    // milliseconds. just to make not pressure the bsc node.
    let delay = 2000;

    if (syncJob) {
        syncJob.cancel();
    }

    for (var i = fromBlock; i <= toBlock; i+=offset) {
        let partEnd = i+offset;

        console.log(`From: ${i} to: ${partEnd}`);
        console.log("session_id:" + sessionId);
        
        // event logs from other session id than ${sessionId} are skipped
        await eventLog.logDeposit(i, partEnd, sessionId).catch(console.error);
        //await eventLog.logClaim(i, partEnd, sessionId);

        await new Promise(r => setTimeout(r, delay));
    }

    if(syncJob) {
        syncJob.reschedule('* * * * *', sync);
    }

    return true;
};

syncJob = schedule.scheduleJob('* * * * *', sync);
