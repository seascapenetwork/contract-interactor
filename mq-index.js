#!/usr/bin/env node

/**
 * The signer runs the Message queries to listen for Messages from other services and returns the signed message with 
 * Private keys.
 * 
 * Requires the following Environment variables:
 * NETWORK_ID       - unique blockchain network id.
 * MQ_HOST          - The host of Rabbit MQ or other Message Broker.
 */
var amqp              = require('amqplib/callback_api');
const chalk 		      = require("chalk");
const clear           = require("clear");
let defaultConsole    = chalk.keyword('orange');
const figlet          = require("figlet");
const Spinner         = require('clui').Spinner;

const { initWallets } = require('./wallets');
const sign            = require('./sign');

/// Seascape Signer consumes only Signing queues.
var queue_postfix = '_sign_queue';

/**
 * @description Print the Greetings to the Seascape Signer
 */
const init = async () => {
    clear();

    console.log(
      chalk.yellow(
        figlet.textSync("Seascape Signer", {
          font: "Standard",
          horizontalLayout: "default",
          verticalLayout: "default"
        })
      )
    );

    console.log(
        defaultConsole(
            "\n\nIt requires the Rabbit MQ on defined network!"
        )
    );
};

(async () => {
    // show introduction
    await init();
  
    // import wallets for certain Network IDs.
    // Its in interactive mode, so requires user to type the passphrase to decrypt the wallets.
    let { 
      nftBrawlWallet, 
      scapePointsWallet, 
      stakingBonusWallet, 
      forumQualityWallet 
    } = await initWallets(process.env.NETWORK_ID);

    let queue = process.env.NETWORK_ID.toString() + queue_postfix;

    // connect signing

    let spinner = new Spinner(`Connecting to the Message Queue server...`);
    spinner.start();

    amqp.connect(`amqp://${process.env.MQ_HOST || 'mq'}`, function(error0, connection) {
        if (error0) {
          throw error0;
        }

        connection.createChannel(function(error1, channel) {
          if (error1) {
            throw error1;
          }
      
          channel.assertQueue(queue, {
            durable: true
          });
          channel.prefetch(1);
          
          console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
          
          channel.consume(queue, function(msg) {
            let content;
            try {
              content = msg.content.toJSON();
            } catch (error3) {
              console.error(chalk.red(error3));
              return;
            }

            if (!content.networkID) {
              console.error(chalk.red(`Missing message.networkID`));
              return;
            }

            if (content.networkID != process.env.NETWORK_ID) {
              console.error(chalk.red(`Message Network ID ${content.networkID} not expect as ${process.env.NETWORK_ID}`));
              return;
            }

            if (!content.signType) {
              console.error(chalk.red("Missing message.signType"));
              return;
            }

            if (!sign.isSupportedType(content.signType)) {
              console.error(chalk.red(`Unsupported ${content.signType} signType`));
              return;
            }

            if (!content.params) {
              console.log(chalk.red("Missing message.params"));
              return;
            }

            let paramError = sign.validateParams(content.signType, content.params);
            if (paramError) {
              console.error(chalk.red(paramError));
              return;
            }

            // call sign.getSignature(content.signType, content.params, and wallets);
          }, {
            // manual acknowledgment mode,
            // see ../confirms.html for details
            noAck: false
          });

          spinner.stop();
        });
     });

})();