var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended: true}));

//setting for hyperledger fabric
const { FileSystemWallet, Gateway } = require('fabric-network');
const path = require('path');
const ccpPath = path.resolve(__dirname,'..', 'basic-network', 'connection.json');
let user= process.argv[2];
app.get('/', function (req, res) {
//res.sendFile('healthrecords.html', { root: __dirname});
});

//getters
app.get('/queryDoc/:doc_id', async function(req, res){
    try{
        //create a new file system based wallet for managing identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        //check to see if we have already enrolled the user
        const userExists = await wallet.exists(user);
        if (!userExists) {
            console.log('An identity for the user "user" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        //create a new gateway for connecting to our peer node
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity:user , discovery: { enabled: true, asLocalhost: true}});
        //get the network (channel) to which our contract is deployed to
        const network = await gateway.getNetwork('mychannel');
        //get the contract from the network
        const contract = network.getContract('healthdoc');
        //evaluate the specified transaction
        const result = await contract.evaluateTransaction('queryDocRecord', req.params.doc_id);
        console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
        res.send(result.toString());
    }catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        res.status(500).json({error: error});
        process.exit(1);
    }
});

//setters
app.post('/addDoc/', async function (req, res) {
    try {
        //create a new file system based wallet to manage identities
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);
        //check to see if we've alreadt enrolled the user
        const userExists = await wallet.exists(user);
        if (!userExists) {
            console.log('An identity for the user does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }
        //create a new gateway for connecting to our peer node
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: user, discovery: { enabled:true, asLocalhost:true }});
        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');
        // Get the contract from the network.
        const contract = network.getContract('healthdoc');
        // Submit the specified transaction.
        let result= await contract.submitTransaction('createDocRecord', req.body.signature);
        console.log(result.toString());
        res.send(result.toString());
        // Disconnect from the gateway.
        await gateway.disconnect();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
})

app.listen(8080);