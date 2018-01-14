'use strict'; //设置为严格模式

const crypto = require('crypto'), //引入加密模块
    RequestPromise = require('request-promise'),
    util = require('util'), //引入 util 工具包
    fs = require('fs'), //引入 fs 模块
    urltil = require('url'),//引入 url 模块
    parseString = require('xml2js').parseString,//引入xml2js包
    config = require('../../config/WechatConfig.json'), //微信消息加解密模块
    msg = require('./msg'),//引入消息处理模块
    accessTokenJson = require('./access_token.json'), //引入本地存储的 access_token
    CryptoGraphy = require('./cryptoGraphy'); //微信消息加解密模块

/**
 * 小说
 * @type {*}
 */
const Fiction = new (require('../Fiction/LingDianKanShu'))();


/**
 * 构建 WeChat 对象 即 js中 函数就是对象
 */
const WeChat = function () {
    //设置 WeChat 对象属性 config
    this.config = config;
    //设置 WeChat 对象属性 token
    this.token = config.token;
    //设置 WeChat 对象属性 appID
    this.appID = config.appID;
    //设置 WeChat 对象属性 appScrect
    this.appScrect = config.appScrect;
    //设置 WeChat 对象属性 apiDomain
    this.apiDomain = config.apiDomain;
    //设置 WeChat 对象属性 apiURL
    this.apiURL = config.apiURL;
};

/**
 * 微信接入验证
 * @param {Request} req Request 对象
 * @param {Response} res Response 对象
 */
WeChat.prototype.auth = function (req, res) {

    // var that = this;
    // this.getAccessToken().then(function(data){
    //     //格式化请求连接
    //     var url = util.format(that.apiURL.createMenu,that.apiDomain,data);
    //     //使用 Post 请求创建微信菜单
    //     that.requestPost(url,JSON.stringify(menus)).then(function(data){
    //         //讲结果打印
    //         console.log(data);
    //     });
    // });

    //1.获取微信服务器Get请求的参数 signature、timestamp、nonce、echostr
    let signature = req.query.signature,//微信加密签名
        timestamp = req.query.timestamp,//时间戳
        nonce = req.query.nonce,//随机数
        echostr = req.query.echostr;//随机字符串

    //2.将token、timestamp、nonce三个参数进行字典序排序
    let array = [this.token, timestamp, nonce];
    array.sort();

    //3.将三个参数字符串拼接成一个字符串进行sha1加密
    let tempStr = array.join('');
    const hashCode = crypto.createHash('sha1'); //创建加密类型
    let resultCode = hashCode.update(tempStr, 'utf8').digest('hex'); //对传入的字符串进行加密

    //4.开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
    if (resultCode === signature) {
        res.send(echostr);
    } else {
        res.send('mismatch');
    }
};

/**
 * 获取微信 access_token
 */
WeChat.prototype.getAccessToken = function () {
    let that = this;
    return new Promise(function (resolve, reject) {
        //获取当前时间
        let currentTime = new Date().getTime();
        //格式化请求地址
        let url = util.format(that.apiURL.accessTokenApi, that.apiDomain, that.appID, that.appScrect);
        //判断 本地存储的 access_token 是否有效
        if (accessTokenJson.access_token === "" || accessTokenJson.expires_time < currentTime) {
            RequestPromise(url).then(function (data) {
                let result = JSON.parse(data);
                if (data.indexOf("errcode") < 0) {
                    accessTokenJson.access_token = result.access_token;
                    accessTokenJson.expires_time = new Date().getTime() + (parseInt(result.expires_in) - 200) * 1000;
                    //更新本地存储的
                    fs.writeFile('./access_token.json', JSON.stringify(accessTokenJson));
                    //将获取后的 access_token 返回
                    resolve(accessTokenJson.access_token);
                } else {
                    //将错误返回
                    reject(result);
                }
            }).catch(function (data) {
                reject(data);
            });
        } else {
            //将本地存储的 access_token 返回
            resolve(accessTokenJson.access_token);
        }
    });
};
/**
 * 创建 微信菜单
 */
WeChat.prototype.createMenu = async function (menus) {
    try {
        let data = await this.getAccessToken();
        //格式化请求连接
        let url = util.format(this.apiURL.Menu.Create, this.apiDomain, data);
        //使用 Post 请求创建微信菜单
        data = await RequestPromise({
            method: 'POST',
            uri: url,
            body: menus,
            json: true
        });
        return data
    } catch (e) {
        return e.message;
    }
};

/**
 * 获取用户身上标签
 * @param OpenId
 * @returns {JSON}
 * @constructor
 */
WeChat.prototype.GetIdList = async function (OpenId) {
    try {
        let data = await this.getAccessToken();
        //格式化请求连接
        let url = util.format(this.apiURL.Tags.GetIdList, this.apiDomain, data);
        //使用 Post 请求创建微信菜单
        data = await RequestPromise({
            method: 'POST',
            uri: url,
            body: {"openid": OpenId},
            json: true
        });
        return data
    } catch (e) {
        return e.message;
    }
};


/**
 * 微信消息处理
 * @param {Request} req Request 对象
 * @param {Response} res Response 对象
 */
WeChat.prototype.handleMsg = function (req, res) {
    let buffer = [], that = this;

    //实例微信消息加解密
    let cryptoGraphy = new CryptoGraphy(that.config, req);

    //监听 data 事件 用于接收数据
    req.on('data', function (data) {
        buffer.push(data);
    });
    //监听 end 事件 用于处理接收完成的数据
    req.on('end', function () {
        let msgXml = Buffer.concat(buffer).toString('utf-8');
        //解析xml
        parseString(msgXml, {explicitArray: false}, async function (err, result) {
            if (!err) {
                result = result.xml;
                //判断消息加解密方式
                if (req.query.encrypt_type === 'aes') {
                    //对加密数据解密
                    result = cryptoGraphy.decryptMsg(result.Encrypt);
                }
                let reportMsg = ""; //声明回复消息的变量

                //判断消息类型
                switch (result.MsgType.toLowerCase()) {
                    case "event": {
                        reportMsg = await that.EventReply(result);
                    }
                        break;
                    case "text": {
                        //判断消息类型为 文本消息
                        reportMsg = await that.TextReply(result);
                    }
                        break;
                    case "image": {
                        let toUser = result.ToUserName; //接收方微信
                        let fromUser = result.FromUserName;//发送方微信
                        reportMsg = msg.imageMsg(fromUser, toUser, result.MediaId);
                    }
                        break;
                    default: {
                        let toUser = result.ToUserName; //接收方微信
                        let fromUser = result.FromUserName;//发送方微信
                        reportMsg = msg.txtMsg(fromUser, toUser, JSON.stringify(result));
                    }
                        break;
                }
                //判断消息加解密方式，如果未加密则使用明文，对明文消息进行加密
                reportMsg = req.query.encrypt_type === 'aes' ? cryptoGraphy.encryptMsg(reportMsg) : reportMsg;
                //返回给微信服务器
                res.send(reportMsg);

            } else {
                //打印错误
                console.log(err);
            }
        });
    });
};

/**
 * @return {promise}
 */
WeChat.prototype.EventReply = async function (result) {
    let reportMsg = "";
    let toUser = result.ToUserName; //接收方微信
    let fromUser = result.FromUserName;//发送方微信
    //判断事件类型
    switch (result.Event.toLowerCase()) {
        case 'subscribe': {
            //回复消息
            let contentArr = [
                {
                    Title: "欢迎关注 " + config.Name + " 公众号",
                    Description: "公众号首页",
                    PicUrl: config.URL+"images/Shy.jpg",
                    Url: config.URL
                }
            ];
            //回复图文消息
            reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
        }
            break;
        case 'click': {
            switch (result.EventKey) {
                case "Record": {
                    //回复消息
                    let contentArr = [
                        {
                            Title: "欢迎关注 " + config.Name + " 公众号",
                            Description: "公众号首页\n\n\n测试消息"
                        }
                    ];
                    //回复图文消息
                    reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
                }
                    break;
                case "FictionRecommend": {
                    let contentArr = [
                        {
                            Title: "小说推介",
                            Description: new Date().toString("yyyy年mm月dd日 HH:MM:ss")
                        }
                    ];
                    let Books = await Fiction.GetFictionRecommend();
                    Books.forEach((book) => {
                        // contentArr[0].Description += ("《{title}》{author}\n    {Serial}{detail}\n\n".toString(book));
                        contentArr.push({
                            Title: book.title,
                            Description:  book.detail|| book.author,
                            Url: book.url
                        });
                    });
                    reportMsg = msg.graphicMsg(fromUser, toUser, contentArr.slice(0, 8));
                }
                    break;
                case "SearchTip": {
                    //回复消息
                    let contentArr = [
                        {
                            Title: "搜索提示",
                            Description: "" + ((new Date()).toString("yyyy年mm月dd日")) + "\n" +
                            "\n小说搜索：" + "小说 关键字" +
                            "\n电影搜索：" + "电影 关键字" +
                            "\n前缀 + 空格 + 关键字" +
                            "\n" +
                            "\n时间：" + ((new Date()).toString("yyyy-mm-dd HH:MM:ss")) +
                            "\n",
                        }
                    ];
                    //回复图文消息
                    reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
                }
                    break;
                default: {
                    reportMsg = msg.txtMsg(fromUser, toUser, JSON.stringify(result));
                }
                    break;
            }
        }
            break;
        case 'scancode_waitmsg': {
            switch (result.EventKey) {
                case "ScanCodeLogin": {
                    let contentArr = [
                        {
                            Title: "自动登录成功",
                            Description: "" + ((new Date()).toString("yyyy年mm月dd日")) + "\n" +
                            "\n登录账号：" + "测试" +
                            "\n登录Token：" + result.ScanCodeInfo.ScanResult +
                            "\n登录时间：" + ((new Date()).toString("yyyy-mm-dd HH:MM:ss")) +
                            "\n",
                            Url:config.URL
                        }
                    ];
                    //回复图文消息
                    reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
                }
                    break;
                default: {
                    reportMsg = msg.txtMsg(fromUser, toUser, JSON.stringify(result));
                }
                    break;
            }
        }
            break;
        default: {
            reportMsg = msg.txtMsg(fromUser, toUser, JSON.stringify(result));
        }
            break;

    }
    return reportMsg;
};
/**
 * @return {promise}
 */
WeChat.prototype.TextReply = async function (result) {
    let toUser = result.ToUserName; //接收方微信
    let fromUser = result.FromUserName;//发送方微信
    let reportMsg = "";
    //根据消息内容返回消息信息
    switch (result.Content) {
        case '文章':
            let contentArr = [
                {
                    Title: "欢迎关注 " + config.Name + " 公众号",
                    Description: "公众号首页",
                    PicUrl: config.URL+"/images/Shy.jpg",
                    Url: config.URL
                }
            ];
            //回复图文消息
            reportMsg = msg.graphicMsg(fromUser, toUser, contentArr);
            break;
        case '获取标签':
            //回复图文消息
            reportMsg = msg.txtMsg(fromUser, toUser, JSON.stringify(await that.GetIdList(fromUser)));
            break;
        default:
            if (result.Content.indexOf("小说 ") !== -1) {
                let BookName = result.Content.substr("小说 ".length);
                let contentArr = [
                    {
                        Title: BookName + " 搜索结果",
                        Description: new Date().toString("yyyy年mm月dd日 HH:MM:ss")
                    }
                    ];
                let Books =await Fiction.SearchBook(BookName);
                Books.forEach((book) => {
                    // contentArr[0].Description += ("《{title}》{author}\n    {Serial}{detail}\n\n".toString(book));
                    contentArr.push({
                        Title: book.title,
                        Description: book.author || book.detail,
                        Url: book.url
                    });
                });
                reportMsg = msg.graphicMsg(fromUser, toUser, contentArr.slice(0,8));
                break;
            }
            reportMsg = msg.txtMsg(fromUser, toUser, JSON.stringify(result));
            break;
    }
    return reportMsg;
};


//暴露可供外部访问的接口
module.exports = WeChat;