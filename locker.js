#!/usr/bin/env node

const inquirer  = require("inquirer");
const chalk     = require("chalk");
const clear     = require("clear");
let defaultConsole    = chalk.keyword('orange');
const figlet    = require("figlet");
const clui = require('clui');
const Spinner = clui.Spinner;

const { ethers } = require("ethers");
const fs        = require("fs");
const walletUtil  = require("./src/wallet-util");

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
            "\n\nCreating Encrypted Wallet!"
        )
    );
};

const askMenu = () => {
    const questions = [
        {
            name: "CHOICE",
            type: "list",
            default: "Create",
            choices: ["Create", "Read", "Delete"]
        }
    ]

    return inquirer.prompt(questions);
}

const askCreation = () => {
    const questions = [
        {
            name: "WALLET",
            type: "input",
            message: "What is the name of the Wallet File (without extension)?"
        },
        {
            name: "PRIVATE_KEY",
            type: "password",
            message: "What is the Private Key?"
        },
        {
            name: "PASSPHRASE",
            type: "password",
            message: "What is the passphrase?"
        }
    ];
    return inquirer.prompt(questions);
};

const create = async () => {
    // Get Credentials
    const { WALLET, PRIVATE_KEY, PASSPHRASE } = await askCreation();

    // Check that user can use Private Key
    let wallet;
    try {
        wallet = new ethers.Wallet(PRIVATE_KEY);
    } catch (error) {
        console.error(chalk.red(`Incorrect Private Key. Make sure its right`));
        process.exit(-1);
    }

    // Passphrase is not empty
    if (PASSPHRASE.length <= 12) {
        console.error(chalk.red(`Passphrase is Empty or too week! Should be atleast 12 Characters`));
        process.exit(2);
    }

    let encryptedWallet = await wallet.encrypt(PASSPHRASE);

    await walletUtil.createWallet(WALLET, encryptedWallet);

    console.log(chalk.blue(`\n\nThe Encrypted Wallet ${WALLET} created!`));
};

const askRead = () => {
    const questions = [
        {
            name: "WALLET",
            type: "input",
            message: "What is the name of the Wallet File (without extension)?"
        },
        {
            name: "PASSPHRASE",
            type: "password",
            message: "What is the passphrase?"
        }
    ];
    return inquirer.prompt(questions);
};

const read = async () => {
    // Get Credentials
    const { WALLET, PASSPHRASE } = await askRead();

    let json = await walletUtil.readWallet(WALLET);
    let spinner = new Spinner(`Decrypting ${WALLET} wallet...`);

    let wallet = await walletUtil.decryptWallet(json, PASSPHRASE, spinner);

    console.log(chalk.blue(`\n\nThe ${WALLET} address is ${wallet.address}!`));
};

const askDelete = () => {
    const questions = [
        {
            name: "WALLET",
            type: "input",
            message: "What is the name of the Wallet File (without extension)?"
        }
    ];
    return inquirer.prompt(questions);
};

const del = async () => {
    // Get Credentials
    const { WALLET } = await askDelete();

    await walletUtil.deleteWallet(WALLET);

    console.log(chalk.blue(`\n\nThe ${WALLET} deleted!`));
};

/**
 * What is the name of the Wallet File (without extension)
 * Type the Private Key
 * Type the Passphrase
 */

(async () => {
    init();

    let { CHOICE } = await askMenu();

    if (CHOICE === "Create") {
        await create();
    } else if (CHOICE === "Read") {
        await read();
    } else if (CHOICE === "Delete") {
        await del();
    }
})();
