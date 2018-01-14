const express = require('express');
const router = express.Router();


/**
 * 小说
 * @type {*}
 */
const Fiction = new (require('../LingDianKanShu'))();

/* GET home page. */
router.get('/:BookNum/', function (req, res, next) {
    Fiction.GetBookPage(req.params.BookNum).then((da)=>{
        res.render('Fiction/index', da);
    }).catch((da)=>{
        res.render('Fiction/index', {title:""});
    });
    // res.render('Fiction/index', {
    //     title: "圣墟",
    //     photo: "https://www.lingdiankanshu.co/BookFiles/BookImages/shengxu.jpg",
    //     author: "辰东",
    //     detail: "在破败中崛起，在寂灭中复苏。\n" +
    //     "　　   沧海成尘，雷电枯竭，那一缕幽雾又一次临近大地，世间的枷锁被打开了，一个全新的世界就此揭开神秘的一角……",
    //     catalog: "all",
    //     chapterList: [
    //         {url:"#",chapter:"第一章"},
    //         {url:"#",chapter:"第二章"},
    //         {url:"#",chapter:"第三章"},
    //         {url:"#",chapter:"第四章"},
    //     ],
    // });
});
/* GET home page. */
router.get('/:BookNum/all', function (req, res, next) {
    Fiction.GetBookCatalog(req.params.BookNum).then((da)=>{
        res.render('Fiction/catalog',da);
    }).catch((da)=>{
        res.render('Fiction/catalog', {title:""});
    });
});
/* GET home page. */
router.get('/:BookNum/:ID', function (req, res, next) {
    Fiction.GetBookShow(req.params.BookNum,req.params.ID).then((da)=>{
        res.render('Fiction/BookShow',da);
    }).catch((da)=>{
        res.render('Fiction/index', {title:""});
    });
});

module.exports = router;