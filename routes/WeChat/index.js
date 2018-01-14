'use strict'; //设置为严格模式
const express = require('express'),
    WeChat  = new (require('./WeChat'))(),
    RequestPromise = require('request-promise'),
    menus  = require('../../config/WeChatMenus'), //引入微信菜单配置
    config = require('../../config/WechatConfig.json');//引入配置文件
const router = express.Router();





router.get('/', function (req, res, next) {
    WeChat.auth(req,res);
});

router.post('/',function(req,res, next){
    WeChat.handleMsg(req,res);
});

//用于请求获取 access_token
router.get('/getAccessToken',function(req,res){
    WeChat.getAccessToken().then(function(data){
        res.send(data);
    });
});
//用于请求获取 access_token
router.get('/createMenu',function(req,res){
    WeChat.createMenu(menus).then(function(data){
        res.send(data);
    });
});

module.exports = router;