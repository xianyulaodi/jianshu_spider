const express = require('express');
const router = express.Router();
const config = require('../config');
const cheerio = require('cheerio'); //可以像jquer一样操作界面
const charset = require('superagent-charset'); //解决乱码问题:
const ejsExcel = require('ejsexcel');   //生成excel表
const fs = require('fs');
const superagent = require('superagent'); //发起请求 
charset(superagent); 
const async = require('async'); //异步抓取 
//const eventproxy = require('eventproxy');  //流程控制
//const ep = eventproxy();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/index', function(req, res, next) {
	const startTime = req.body.startTime;
	const endTime = req.body.endTime;
	const crawler = new Crawler(res,startTime,endTime);
	crawler.init();
});


// 将页面导出为 excel的文章： https://github.com/sail-sail/ejsExcel

// 爬虫构造函数
function Crawler(res,startTime,endTime) {
	this.baseUrl = "http://www.jianshu.com";
	this.currentCount = 0;
	this.res = res;
	this.errorUrls = [];
	this.startTime = Number(startTime);
	this.endTime = Number(endTime);
}

Crawler.prototype.init = function() {
	this.crawlUserCenter();
}

// 封装 superagent 函数
Crawler.prototype.fetchUrl = function(url,callback) {
	var that = this;
	superagent
    .get(url)
    .charset('utf-8')
    .end(function (err, ssres) {	 
    	if(err) {
        that.errorUrls.push(url);
			  console.log('抓取【'+url+'】这个url的时候出错了');	
			  return false;    		
    	}
    	callback(ssres.text);
    });		
}

// 获取简书用户中心的url
Crawler.prototype.resetUserCenUrl = function() {
	var urlCollections = [];
	var uidList = config.data;
	var baseUrl = this.baseUrl;
	uidList.map(function(elem,index) {
		var url = baseUrl+ '/u/'+ elem.uid; 
		urlCollections.push(url);
	});
	return urlCollections;
}


// 爬取用户中心,从中获取文章详情链接, 异步抓取，控制并发为5条
Crawler.prototype.crawlUserCenter = function() {
	var that = this;
	var urlCollections = this.resetUserCenUrl();
	async.mapLimit(urlCollections, 5, function (url, callback) { 
		that.currentCount++;
		console.log('现在正在抓取:',url,',现在的并发数为:'+that.currentCount);
    that.fetchUrl(url, function(html) {
    	that.currentCount--;
			const $ = cheerio.load(html);
      var urlArr = that.getDetailUrl($);
			callback(null,urlArr);  //callback是必须的
    });

  }, function (err, result) { // 并发结束后的结果
  	that.currentCount = 0;
  	that.crawArticleDetail(result);
    return false;
  });
}


// 获取某段时间内文章链接集合
Crawler.prototype.getDetailUrl = function($) {
	const	articleList = $('#list-container .note-list li'),
				urlCollections = [],
				startTime = this.startTime,
				endTime = this.endTime,
				baseUrl = this.baseUrl;
	for(var i = 0,len = articleList.length; i < len; i++) {
		var crateAt = articleList.eq(i).find('.author .time').attr('data-shared-at');
		var createTime = new Date(crateAt).getTime();
		if(createTime >= startTime && createTime <= endTime) {
			var articleUrl = articleList.eq(i).find('.title').attr('href');
      var url = baseUrl + articleUrl;
			urlCollections.push(url);
		}
	}
	return urlCollections;
}


Crawler.prototype.spreadDetailUrl= function(urls) {
	var urlCollections = [];
	for(var i = 0; i < urls.length; i++) {
		var urlArr = urls[i];
		for(var k = 0; k < urlArr.length;k++) {
			var url = urlArr[k];
			urlCollections.push(url);
		}
	}
	return urlCollections;
}

// 爬取文章详情
Crawler.prototype.crawArticleDetail = function(articleList) {
	var baseUrl = this.baseUrl;
	var urlCollections = this.spreadDetailUrl(articleList);
	var that = this;
	// 获取所有的文章详情页的信息
	async.mapLimit(urlCollections, 5, function(url, callback) { 
		that.currentCount ++;
		console.log('现在正在抓取:',url,'现在的并发数为:' +that.currentCount);
    that.fetchUrl(url, function(html) {
    	const $ = cheerio.load(html,{decodeEntities: false});
	    const  data = {
	    		title: $('.article .title').html(),
	    		wordage: $('.article .wordage').html(),
	    		publishTime: $('.article .publish-time').html(),
	    		author: $('.author .name a').html()
	    	}; 
	    that.currentCount --;
			callback(null,data);  
			
    });
   
  }, function (err, result) {
  	var result = that.removeSame(result);
  	var numArr = that.makeArticleNum(result);
  	that.res.json({
  		data: result,
  		numArr: numArr
  	});
  	that.createExcel(result,numArr);
  	console.log('抓取数据完毕，一共抓取了：'+ result.length +'篇文章');
  	// 爬虫结束后的回调，可以做一些统计结果
    return false;
  });
}

/**
[{ name: '咸鱼老弟', num: 2, wordageNum: 3700 }]
**/
Crawler.prototype.makeArticleNum = function(dataArr) {
	var obj = {};
	var arr = [];
  dataArr.forEach(function(item,index) {
    var author = item.author;
    var wordage = item.wordage.match(/\d+/g)[0];
    if(obj[author]) {
      obj[author].push(wordage);
    } else {
      obj[author] = [wordage];
    }
  });
  for(var name in obj) {
    var dataObj = {};
    dataObj.name = name;
    dataObj.num = obj[name].length;
    dataObj.wordageNum = obj[name].reduce((count,v) => Number(count)+Number(v), 0);
    arr.push(dataObj);
  }
  return arr;	
}

// 生成excel表
Crawler.prototype.createExcel = function(dataArr,numArr) {
	const exlBuf = fs.readFileSync(config.excelFile.path + "/report.xlsx");
	//数据源
	var data = [ 
	   [{"table_name":"7班简书统计表","date": new Date()}],
	   dataArr,
	   numArr
	];
	//用数据源(对象)data渲染Excel模板
	ejsExcel.renderExcel(exlBuf, data).then(function(exlBuf2){
		fs.writeFileSync(config.excelFile.path + "/report2.xlsx", exlBuf2);
		console.log("生成report2.xlsx");
	}).catch(function(err) {
		console.error(err);
	});
}

Crawler.prototype.removeSame = function(arr) {
	var arr = arr;
	var newArr = [];
	var obj = {};
	arr.forEach(function(item) {
    if(!obj[item.title]) {
      newArr.push(item);
      obj[item.title] = item.title;
    } 
  });
  return newArr;
}

module.exports = router;
