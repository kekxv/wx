'use strict';//设置为严格模式

const
    RequestPromise = require('request-promise'),
    util = require('util'), //引入 util 工具包
    cheerio = require('cheerio'),
    iconv = require('iconv-lite'),
    config = require('../../config/WechatConfig.json'),
    urltil = require('url');//引入 url 模块

const LingDianKanShu = function () {

};

LingDianKanShu.FictionUrl = config.URL + "Fiction";
LingDianKanShu.Source = "零点小说";
LingDianKanShu.SourceUrl = "https://m.lingdiankanshu.co/";
LingDianKanShu.prototype.Url = {
    GetFictionRecommend: function ($) {
        let books = [];
        $('.hot_sale').each(function (idx, element) {
            let $element = $(element);
            let title = $element.find("a");
            if (title.length === 1) {
                let book = {
                    title: $element.find("a > .title").text().trim(),
                    author: $element.find("a > .author").text().trim(),
                    Serial: "",
                    detail: $element.find("a > .review").text().trim(),
                    photo: $element.find("a > img").attr("src").trim(),
                    url: LingDianKanShu.FictionUrl + title.attr("href").trim()
                };
                books.push(book);
            }
        });
        return books;
    }
    , SearchUrl: {
        Url: LingDianKanShu.SourceUrl + "SearchBook.php?q={BookName}&s=16865089933227718744",
        GetData: function ($) {
            let books = [];
            $('.recommend.mybook > .hot_sale').each(function (idx, element) {
                let $element = $(element);
                let title = $element.find("a");
                if (title.length === 1) {
                    let author = $element.find("a > .author");
                    let book = {
                        title: $element.find("a > .title").text().trim(),
                        author: $(author[0]).text().trim(),
                        Serial: $(author[1]).text().trim(),
                        detail: "",
                        photo: "",
                        url: LingDianKanShu.FictionUrl + title.attr("href").trim()
                    };
                    books.push(book);
                }
            });
            return books;
        }
    }
    , BookPage: {
        Url: LingDianKanShu.SourceUrl + "{BookNum}/",
        GetData: function ($) {
            let book = {};
            book.title = $("header  .title").text().trim();
            book.photo = $(".synopsisArea img").attr("src").trim();
            book.author = $(".synopsisArea .author").text().replace(/作者[：: ]/g, "").trim();
            book.detail = $("#breview").text().replace(/[  \n\t]{2,}/g, "").trim();
            book.catalog = "all";

            book.chapterList = [];
            $('#chapterlist').find('a').each(function (idx, element) {
                let $element = $(element);
                book.chapterList.push({
                    url: $element.attr("href").replace(/\..*$/g, "").trim(),
                    chapter: $element.text(),
                });
            });
            return book;
        }
    }
    , BookCatalog: {
        Url: LingDianKanShu.SourceUrl + "{BookNum}/all.html",
        GetData: function ($) {
            let book = {};
            book.title = $("header  .title").text().trim();
            book.chapterList = [];
            $('#chapterlist').find('a').each(function (idx, element) {
                let $element = $(element);
                book.chapterList.push({
                    url: $element.attr("href").replace(/\..*$/g, "").trim(),
                    chapter: $element.text(),
                });
            });
            return book;
        }
    }
    , BookShow: {
        Url: LingDianKanShu.SourceUrl + "{BookNum}/{BookChapterID}.html",
        GetData: function ($) {
            let book = {};
            book.title = $("header  .title").text().trim();
            book.LastChapter = "./" + $("#pt_prev").attr("href").replace(/\..*$/g, "").trim();
            book.NextChapter = "./" + $("#pt_next").attr("href").replace(/\..*$/g, "").trim();

            book.Source = LingDianKanShu.Source;
            book.SourceUrl = LingDianKanShu.SourceUrl;

            $(".readinline").remove();
            let chaptercontent = $("#chaptercontent");
            let contents = chaptercontent.contents();
            if (contents.length > 7) {
                for (let i = 2; i <= 7; i++) {
                    $(contents[contents.length - i]).remove();
                }
            }
            book.details = chaptercontent.html();

            return book;
        }
    }
};

/**
 * 书本搜索
 * @param BookName 书名
 * @returns {Array}
 * @constructor
 */
LingDianKanShu.prototype.SearchBook = async function (BookName) {
    let url = this.Url.SearchUrl.Url.toString({BookName: encodeURI(BookName)});
    let data = await RequestPromise(url);
    // let html = iconv.decode(data, 'gb2312');
    let $ = cheerio.load(data, {decodeEntities: false});
    return this.Url.SearchUrl.GetData($);
};

/**
 * 小说主页
 * @returns {Array}
 * @constructor
 */
LingDianKanShu.prototype.GetBookPage = async function (BookNum) {
    let url = this.Url.BookPage.Url.toString({BookNum: encodeURI(BookNum)});
    let data = await RequestPromise(url);
    let $ = cheerio.load(data, {decodeEntities: false});
    return this.Url.BookPage.GetData($);
};
/**
 * 小说完整目录
 * @returns {Array}
 * @constructor
 */
LingDianKanShu.prototype.GetBookCatalog = async function (BookNum) {
    let url = this.Url.BookCatalog.Url.toString({BookNum: encodeURI(BookNum)});
    let data = await RequestPromise(url);
    let $ = cheerio.load(data, {decodeEntities: false});
    return this.Url.BookCatalog.GetData($);
};
/**
 * 小说章节内容
 * @returns {Array}
 * @constructor
 */
LingDianKanShu.prototype.GetBookShow = async function (BookNum, BookChapterID) {
    let url = this.Url.BookShow.Url.toString({BookNum: encodeURI(BookNum), BookChapterID: encodeURI(BookChapterID)});
    let data = await RequestPromise(url);
    let $ = cheerio.load(data, {decodeEntities: false});
    return this.Url.BookShow.GetData($);
};
/**
 * 小说推介
 * @returns {Array}
 * @constructor
 */
LingDianKanShu.prototype.GetFictionRecommend = async function () {
    let data = await RequestPromise(LingDianKanShu.SourceUrl);
    let $ = cheerio.load(data, {decodeEntities: false});
    return this.Url.GetFictionRecommend($);
};
//暴露可供外部访问的接口
module.exports = LingDianKanShu;