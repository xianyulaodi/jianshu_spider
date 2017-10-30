const express = require('express');
const router = express.Router();
const config = require('../config');
const cheerio = require('cheerio'); //可以像jquer一样操作界面
const charset = require('superagent-charset'); //解决乱码问题:
const superagent = require('superagent'); //发起请求 
charset(superagent); 
const async = require('async'); //异步抓取 
const eventproxy = require('eventproxy');  //流程控制
const ep = eventproxy();

router.get('/', function(req, res, next) {
	const crawler = new Crawler();
	crawler.init();
  res.render('index', { title: 'Express' });
});

// 将页面导出为 excel的文章： http://blog.csdn.net/zhudiwoaini/article/details/50847635

// 爬虫构造函数
function Crawler(res) {
	this.baseUrl = "http://www.jianshu.com";
}

Crawler.prototype.init = function() {
	this.crawlUserCenter();
	this.concurrency();
}

// 封装 superagent 函数
Crawler.prototype.fetchUrl = function(url,callback) {
	superagent
    .get(url)
    .charset('utf-8')
    .end(function (err, ssres) {	 
    	if(err) {
			  console.log('抓取【'+url+'】这个url的时候出错了');
        return false;	    		
    	}
    	callback(ssres.text);
    });		
}

// 爬取用户中心,数据来源于配置文件
Crawler.prototype.crawlUserCenter = function() {
	var that = this;
	var uidList = config.data;
	var baseUrl = this.baseUrl;
	//异步抓取页面，控制并发为5条
	async.mapLimit(uidList, 10, function (data, callback) {
		var url = baseUrl+ '/u/'+ data.uid; 
    that.fetchUrl(url, function(html) {
			const $ = cheerio.load(html);
  		that.getArticleLastWeek($);      	
    });
  }, function (err, result) {
  	console.log('async result',result);
  	// 爬虫结束后的回调，可以做一些统计结果
    return false;
  });
}

// 获取上一周写的文章链接
Crawler.prototype.getArticleLastWeek = function($) {
	const articleList = $('#list-container .note-list li');
	const len = articleList.length;
	const lastWeekArticleUrl = [];
	for(var i = 0; i < len; i++) {
		var crateAt = articleList.eq(i).find('.author .time').attr('data-shared-at');
		var startTime = new Date('2017-10-23 00:00:00').getTime();
		var endTime = new Date('2017-10-29 24:00:00').getTime();
		var createTime = new Date(crateAt);
		if(createTime >= startTime && createTime <= endTime) {
			var articleUrl = articleList.eq(i).find('.title').attr('href');
			lastWeekArticleUrl.push(articleUrl);
		}
	}
	this.getArticleDetail(lastWeekArticleUrl);
}

// 获取文章详情
Crawler.prototype.getArticleDetail = function(articleList) {
	var baseUrl = this.baseUrl;
	var that = this;
	// 获取所有的文章详情页的信息
	articleList.forEach(function(item) {
		var url = baseUrl + item;
		that.fetchUrl(url, function(html) {
				const $ = cheerio.load(html,{decodeEntities: false});
				const data = {
	    		title: $('.article .title').html(),
	    		wordage: $('.article .wordage').html(),
	    		publishTime: $('.article .publish-time').html(),
	    		author: $('.author .name a').html()
	    	};
      	ep.emit('article_data', data);			
    });		
  });
}

// 命令 ep 重复监听 urls.length 次（在这里也就是 20 次） `article_data` 事件再行动,所以这里会产生重复数据
Crawler.prototype.concurrency = function() {
	var that = this;
	ep.after('article_data', 70, function (resp) {
		var result = that.removeSame(resp);
		console.log('最终结果========================：<br />',result);
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
