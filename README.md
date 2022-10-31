# dwebPayMono

Home of dwebPay, a framework for payment of dApps and wallet

# Features

1. Support any dApp and wallet
2. Use decentrolized bridge to connect the dApp and wallet
3. Communication is encrypted

# How to use?

## dApp developer

**Install**

```
<script src="https://unpkg.com/@dwebpay/app@stable/wapp.min.js"></script> //stable version
<script src="https://unpkg.com/@dwebpay/app@latest/wapp.min.js"></script> //latest beta version
```

### Sample code

1. Initialize the app

```
    const wpay = new WalletApp();
    wpay.init({ appid: "app.nbdomain.a", bridge: "https://api.nbdomain.com", debug: true })
    //appid: a valid nbdomain, content is a JSON. Example:
    {
        "name":"A test app",
        "icon":"https://bloodchen.github.io/dwebPayMono/static/test.webp",
        "allowUri":["http://localhost/nbdomain.a/","https://nbdomain.com/"] //only verify when debug is NOT true
    }
```

> Note: Learm more about NBdomain at https://nbdomain.com

2. setup event handlers

```
    wpay.on('session_notify', async (walletId,event) => {
        const name = event.name
        if (name === 'approved') {
            console.log("permission approved")
            const ret = await wpay.getBalance(walletId,'dfasfasdf', 'ar')
            console.log("getBalance:", ret)
        }
    })
    wpay.on('session_request', async (walletId,request) => {

    })
    wpay.onElse(async (eName, ...argc) => {
        console.log("got event from wapp", eName, ...argc)
        if (eName === "closed") {

        }
    }
```

3. connect to wallet with the required permission. A qr code will appear if it's not connected before
   await wpay.connect(walletId,{ permissions: "methods:['getBalance','getAddresses','signMessage','sendTransaction'],chains:['bsv','ar']" })

### dApp API

> Note: walletId can be omitted if there is only one wallet connected to the app  
> All functions except specified will return {code:0} for success and non-0 for failure.

- init({ appid: "app.nbdomain.a", bridge: "https://api.nbdomain.com", debug: true })  
  **appid**: (string) unique nbdomain key that has meta infomation of the app  
  **bridge**: (string) the nbnode that acts as the relay  
  **debug**: enable debug mode to develop

  **return**: (bool) true/false

- async connect({walletId,permissions}) //show QR dialog if it's not connected, otherwise just return  
  **walletId**: (string) Id of the wallet.  
  **permissions**: (object) required permissions
  **return**:{code:0} means get approved by the wallet

- disconnect({walletId})  
  **walletId**: (string) Id of the wallet. Pass null to show the QR code dialog.

- getAddresses({walletId,chain}) //get all addresses of a chain  
  **walletId**: (string) Id of the wallet  
  **chain**: (string) chain ticker

- getAccounts({walletId,chain}) //get all accounts, xxx@dddd.a style, of a chain  
  **walletId**: (string) Id of the wallet  
  **chain**: chain ticker

- getBalance({walletId,address,chain}) //get balance of an address  
  **walletId**: (string) Id of the wallet  
  **address**: (string) address of the wallet  
  **chain**: (string) chain ticker

- getPubKey({walletId,address,chain}) //get public key of an address  
  **walletId**: (string) Id of the wallet  
  **address**: (string) address of the wallet  
  **chain**: (string) chain ticker

- signTransaction({walletId,options}) //sign transaction according to the options and return the signed raw tx  
  **walletId**: (string) Id of the wallet  
  **options**: (object)

  ```
  options = {
      data:"", //data will be put into the transaction
      to:[
          {address:"",value:100}, //payment address and amount. The amount is 1/million of the token
          {address:"",value:100}
      ],
      more_data:"", //more_data will not be procceded and return to the app
      chain:"ar"   //chain
  }
  ```

  > Note: For chains that can only do 1 to 1 payment, eg: ar, eth, multipal payment address will generate multipal transactions and the data will only set to the first transaction. For bitcoin-like chain, they will be in one trasaction with multipal outputs

- sendTransaction({walletId,options}) //send transaction according to the options  
  **walletId**: (string) Id of the wallet  
  **options**: refer to signTransaction

- signMessage({walletId,message,address,chain}) //sign message according to the options  
  **walletId**: (string) Id of the wallet  
  **message**: (string) data to sign  
  **address**: (string) the address's private key used to sign  
  **chain**: (string) chain ticker

- decrypt({walletId,data,address,chain}) //decrypt data according to the options  
  **walletId**: (string) Id of the wallet  
  **data**: (UInt8Array) data to decrypt  
  **address**: (string) the address's private key used to sign  
  **chain**: (string) chain ticker

* isConnected({walletId}) //return connect state of the wallet

### wallet events to dApp

#### session_notify //the notification event that does require return value

`wpay.on('session_notify', async (walletId,event)=>{...})` //event.name is the event name
event.name can be:

1. approve //the required permissions are approved

## Wallet developer

**Install**

```
<script src="https://unpkg.com/@dwebpay/wallet@stable/wallet.min.js"></script> //stable version
<script src="https://unpkg.com/@dwebpay/wallet@latest/wallet.min.js"></script> //latest beta version
```

1. Initialize the wallet host

```
const whost = new WalletHost();
whost.init({})
```

2. setup event handlers

```
    //For session_request, return code:0 for success, non 0 for failure
    whost.on('session_request', async (appId,request) => {
        const { name, para } = request
        console.log("got request name:", name, " para:", para)
        if (name === 'getBalance') {
            const account = para[0], chain = para[1]
            return { code: 0, balance: 1223332 }
        }
        if (name === 'pair_request') { //return code:0 to approve. The developer may present an UI for users to approve the permissions
            const appInfo = para[0]
            return { code: 0 }
        }
        if (name === 'sendTransaction') {
            const body = para[0]
            return { code: 0 }
        }
    })
    //For session_notify, there is no need to return
    whost.on('session_notify', async (appId,event) => {
        const name = event.name

    })
    whost.onElse(async (eName, ...args) => {
        console.log("got event from whost", eName, args)
        if (eName === "closed") {
            // wpay.disconnect()
        }
    })
```
