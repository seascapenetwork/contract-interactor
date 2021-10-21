let mysql = require('mysql');

var con = null;

module.exports.getConnection = async function() {
	if (!con){
		connect().catch(console.log);
	}
	return con;
};

let connect = async () => {
	if (con !== null){
		con.destroy();
		con = null;
	}
	con = mysql.createConnection({
		host: process.env.DATABASE_HOST,
		user: process.env.DATABASE_USERNAME,
		password: process.env.DATABASE_PASSWORD,
		database: process.env.DATABASE_NAME
	});

	con.connect(handleError);
	// con.on('error', handleError);

	// run sql keep conn live
	setInterval(() => {
		// con.ping(err => {
		// 	if (err) {
		// 		console.log("ping error:", err)
		// 	}
		// })
		new Promise(function(resolve, reject) {
			con.query("select version()", function(err, res, _fields) {
				if (err) {
					console.log('db err:',err);
				} else {
					// console.log(res[0]["version()"]);
				}
			});
		});
	}, 1000);
	let res = await con.connect();

	return con;
};

function handleError (err) {
	if (err) {
		// 如果是连接断开，自动重新连接
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			connect().then()
		} else {
			console.error(err.stack || err);
		}
	}
}