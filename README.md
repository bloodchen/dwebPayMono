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
<script src="https://unpkg.com/@dwebpay/app@release"></script>
```

1. Initialize the app

```
    const wpay = new WalletApp();
    wpay.init({ appid: "app.nbdomain.b", bridge: "https://api.nbdomain.com", debug: true })
    //appid: a valid nbdomain, content is a JSON. Example:
    {
        "name":"A test app",
        "icon":"https://www.testapp.com/icon.png",
        "allowUri":["http://localhost/nbdomain.a/","https://nbdomain.com/"] //only verify when debug is NOT true
    }
```

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

## Wallet developer

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
    whost.onElse(async (eName, appId,para) => {
        console.log("got event from whost", eName, para)
        if (eName === "closed") {
            // wpay.disconnect()
        }
    })
```
