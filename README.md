# dwebPayMono
Home of dwebPay, a framework for payment of dApps and wallet

# Features

1. Support any dApp and wallet
2. Use decentrolized bridge to connect the dApp and wallet 
3. Communication is encrypted

# How to use?

## dApp developer

** install **

```
<script src="https://unpkg.com/@dwebpay/app@release"></script>
```

```
    // 1. Initialze the app
    const wpay = new WalletApp();
    wpay.init({ appid: "app.nbdomain.b", bridge: "http://localhost:9001", debug: true })
    //appid: a valid nbdomain, content is a JSON. Example:
    {
        "name":"A test app",
        "icon":"https://www.testapp.com/icon.png",
        "allowUri":["http://localhost/nbdomain.a/"]
    }
    // 2. setup event handlers
    wpay.on('session_event', async (event) => {
        const name = event.name
        if (name === 'approved') {
            console.log("permission approved")
            const ret = await wpay.getBalance('dfasfasdf', 'ar')
            console.log("getBalance:", ret)
        }
    })
    wpay.on('session_request', async (request) => {

    })
    wpay.onElse(async (eName, ...argc) => {
        console.log("got event from wapp", eName, ...argc)
        if (eName === "closed") {

        }
    }
    ...
    //3. connect to wallet with the required permission. A qr code will appear if it's not connected before
    await wpay.connect({ permissions: "chains:['bsv','ar']" })

```