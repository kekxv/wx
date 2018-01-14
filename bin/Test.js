#!/usr/bin/env node
'use strict'; //设置为严格模式


require('./FormatExtend');
const Fiction = new (require('../routes/Fiction/LingDianKanShu'))();
// Fiction.SearchBook("圣墟").then((da)=>{console.log(da);});
Fiction.GetBookPage("117993").then((da)=>{console.log(da);});
