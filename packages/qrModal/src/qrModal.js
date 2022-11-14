const payPopupHtml = `
<style scoped>
._opay_pageOverlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
  background: #000;
  z-index: 1000;
}

#_opay_payPopup {
  display:flex;
  position:absolute;
  align-items: center;
  left: 50%; 
  top: 50%; 
  transform: translate(-50%, -50%);
  width: 30rem;
  z-index: 1100;
}
._opay_closeButton {
    margin: 5px;
    cursor: pointer;
    float: right;
  }

._qrcode{
  box-shadow: 0 4px 12px 0 rgb(37 41 46 / 25%);
  width:300px;
  height:300px;
  margin:20px auto;
  display:block;
}
._wallet{
  width:140px;
  height:180px;
  margin:50px auto;
}
._wallet ._icon{
  margin:5px 3px;
  width:96px;
  height:96px;
  box-shadow: 0 4px 12px 0 rgb(37 41 46 / 25%);
}
._subTitle{
  color: rgba(60, 66, 82, 0.6);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0;
    line-height: 1.1875em;
    margin: 10px 0 20px 0;
    text-align: center;
    width: 100%;
}
._tabs {
  width: 100%;
  text-align:center;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.25);
}

._tab-control {
  display: inline-block;
  text-align:center;
  border-bottom: 2px solid transparent;
  font-size: 1.25rem;
  padding: 0.6rem 2rem;
  cursor: pointer;
  transition: all 0.25s ease;
}

._tab-control:hover {
  color: #ed1e79;
}

._tab-content {
  border-top: 1px solid #ed1e79;
  padding: 1rem;
}

._tab-panel {
  display: none;
  height:400px;
}

/* Magic style */
input[type="radio"]:checked + ._tab-control {
  font-weight: 600;
  color: #ed1e79;
  border-bottom-color: #ed1e79;
}

#_tab-1:checked ~ ._tab-content > #_tab-panel-1 {
  display: block;
}

#_tab-2:checked ~ ._tab-content > #_tab-panel-2 {
  display: block;
}
</style>
<div id="_opay_payPopup">

  <div class="_tabs">
    <div class="_opay_closeButton">
        ✖
      </div>
    <input hidden type="radio" name="tab-css" id="_tab-1" checked />
    <label class="_tab-control" for="_tab-1" tid="qrPay">QR Code</label>
    <input hidden type="radio" name="tab-css" id="_tab-2" />
    <label class="_tab-control" for="_tab-2" tid="desktop">Desktop</label>
  
    <div class="_tab-content">
      <div id="_tab-panel-1" class="_tab-panel">
        <p id="_debug" style="color:red;">DEBUG (not for production)</p>
        <div class="_subTitle" tid="title_qr_panel">Scan QR code with an dwebPay compatible wallet 
        </div>
        <img id="_opay_qrcode" class="_qrcode"></img>
        <a href="#" id="_copy_clipboard" tid="_copy_clipboard">Copy to Clipboard</a><span id='_check_success' style="display:none;">✌</span>
      </div>
      <div id="_tab-panel-2" class="_tab-panel">
        <div class="_subTitle" tid="title_desktop_panel">
          Choose your prefered Wallet
        </div>
        <div class="_wallet">
        <img id="_vboxWallet" src="$scriptPath$vbox-icon.png" class="_icon"/><p>VBox</p></div>
      </div>
      
    </div>
  </div>
</div>
`
import { Util } from "./util"
let scriptPath = "";
try { scriptPath = document.currentScript.src; } catch (e) { }
export default class qrModal {
  constructor({ bridge, debug }) {
    this.nbNode = bridge
    this.debug = debug
  }
  async show(uri, callback) {
    const self = this
    this.abortController = new AbortController()
    let emPopup = document.querySelector("#_opay_payPopup");
    if (!emPopup) {
      let src = scriptPath
      src = src.slice(0, src.lastIndexOf('/') + 1)
      const html = payPopupHtml.replace("$scriptPath$", src)
      emPopup = document.createElement('div');
      emPopup.innerHTML = html;
      document.body.appendChild(emPopup);
      emPopup = document.querySelector("#_opay_payPopup");
    } else {
      emPopup.style.display = 'flex';
    }
    let emOverlay = document.querySelector("._opay_pageOverlay");
    if (!emOverlay)
      document.querySelector("body").insertAdjacentHTML('beforeend', '<div class="_opay_pageOverlay"></div>');
    else {
      emOverlay.style.display = 'block';
    }
    self.translate("_opay_payPopup");
    await self.genQRImg(uri, "_opay_qrcode")

    if (!self.debug) {
      document.querySelector("#_debug").style.display = 'none'
    }
    //vbox button
    this.onEvent('click', "#_vboxWallet", () => {
      callback("clickWallet", "vbox")
    });
    // Close button
    this.onEvent('click', "._opay_closeButton", () => {
      console.log('click close')
      this.closePopup()
      callback("closed")
    });
    this.onEvent('click', "#_copy_clipboard", (event) => {
      event.preventDefault();
      navigator.clipboard.writeText(uri).then(() => {
        document.querySelector('#_check_success').style.display = 'inline'
        setTimeout(() => {
          document.querySelector('#_check_success').style.display = 'none'
        }, 3000)
      });
    })
    this.callback = callback
  }
  onEvent(eventType, selector, callback) {
    const elm = document.querySelector(selector)
    if (elm) {
      elm.addEventListener(eventType, callback, { signal: this.abortController.signal })
    }
  }
  closePopup() {
    document.querySelector('#_opay_payPopup').style.display = 'none'; // hide
    document.querySelector('._opay_pageOverlay').style.display = 'none'; // hide
    if (this.callback) {
      this.abortController.abort()
    }
  }
  close() {
    this.closePopup()
  }
  translate(parentID) {
    if (navigator.language.toLowerCase() != "zh-cn") return;

    var cntext = {
      webPay: "网页",
      qrPay: "扫码支付",
      desktop: "桌面",
      vbox: "傲游 VBox",
      dot: "打点钱包",
      title: "点击钱包或扫码",
      vinstall: "未检测到，点击安装",
      login: "登录",
      next: "下一步",
      title_qr_panel: "请使用 dwebPay 兼容钱包扫描",
      title_desktop_panel: "请点击钱包",
      _copy_clipboard: "复制到剪贴板"
    }
    var items = document.getElementById(parentID).querySelectorAll("[tid]");
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const tid = item.attributes['tid'].value;
      item.innerText = cntext[tid];
    }
  }
  async genQRImg(uri, imgID, checker = true) {
    if (!window.qrcode) {
      await Util.loadScript("https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js");
    }
    const strQR = uri;
    var typeNumber = 0;
    var errorCorrectionLevel = "L";
    var qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(strQR);
    qr.make();
    let strImgTag = qr.createDataURL(4);
    document.getElementById(imgID).src = strImgTag;
  }
}
