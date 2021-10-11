const { ethers } = require("ethers");
const fs = require("fs");
const chalk     = require("chalk");

const getWalletPath = (file) => {
    return `./private/${file}.json`;
};

/**
 * Returns the relative path to the Encrypted Wallet relative to src/wallet-util
 * @param {String} file path starting from wallet-util.js script 
 * @returns 
 */
module.exports.getWalletPath = getWalletPath;

/**
 * Decrypt the Keystore wallet with the given password. If failed to decrypt, then return undefined.
 * @param {string} json 
 * @param {string} password 
 * @param {clui.Spinner} spinner 
 * @returns ethers.Wallet
 * @warning exits on error.
 */
module.exports.decryptWallet = async (json, password, spinner) => {
    spinner.start();

    let wallet;
    try {
        wallet = await ethers.Wallet.fromEncryptedJson(json, password);
    } catch (error) {
        spinner.stop();

        console.log(chalk.red(error));
        process.exit(2);
    }

    spinner.stop();
    return wallet;
};

/**
 * Read Encrypted Wallet and return the JSON String.
 * @param {string} path 
 * @returns Promise => json string
 * @warning exits on error.
 */
module.exports.readWallet = (file) => {
    let path = getWalletPath(file);

    return new Promise((resolve, _reject) => {
        fs.readFile(path, (error, data) => {
            if (error) {
                console.log(chalk.red(error));
                process.exit(1);
            } else {
                resolve(data);
            }
        });
    })
}

/**
 * Deletes the Encrypted JSON file from the directory
 * @param {String} file 
 * @returns TRUE on success
 */
module.exports.deleteWallet = (file) => {
    let path = getWalletPath(file);

    return new Promise((resolve, _reject) => {
        fs.unlink(path, (error) => {
            if (error) {
                console.log(chalk.red(error));
                process.exit(1);
            } else {
                resolve(true);
            }
        });
    })
}


/**
 * Writes the Encrypted JSON file to the directory
 * @param {String} file name
 * @param {ethers.Wallet} file name
 * @returns TRUE on success
 */
 module.exports.createWallet = async (file, wallet) => {
    let path = getWalletPath(file);

    fs.writeFileSync(path, wallet);
}