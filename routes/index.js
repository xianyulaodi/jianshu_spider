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
	const startTime = Number(req.body.startTime),
	      endTime = Number(req.body.endTime);
	crawler(res,startTime,endTime);

});


// 将页面导出为 excel的文章： https://github.com/sail-sail/ejsExcel
const crawler = (function() {

	let _baseUrl = "http://www.jianshu.com",
      _currentCount = 0,
      _errorUrls = [];

	// 封装 superagent 函数
  const fetchUrl = (url,callback) => {
  	let fetchStart = new Date().getTime();
		superagent
	    .get(url)
	    .charset('utf-8')
	    .end((err, ssres) => {	 
	    	if(err) {
	        _errorUrls.push(url);
				  console.log('抓取【'+ url +'】出错');	
				  return false;    		
	    	}
	    	let spendTime = new Date().getTime() - fetchStart;
	    	console.log('抓取:'+ url +'成功,耗时：'+ spendTime +'毫秒,现在并发数为:'+ _currentCount );
	    	_currentCount--;
	    	callback(ssres.text);
    });		  	
  }

  // 爬取用户中心，获取某个时间段文章详情链接
  const crawlUserCenter = (res,startTime,endTime) => {
  	const centerUrlArr = config.data;
    async.mapLimit(centerUrlArr, 5, (elem, callback) => { 
			_currentCount++;
	    fetchUrl(elem.url, (html) => {
				const $ = cheerio.load(html);
	      const detailUrlArr = getDetailUrlCollections($,startTime,endTime);
				callback(null,detailUrlArr);  //callback是必须的
	    });

	  }, (err, detailUrlArr) => { // 并发结束后的结果
	  	_currentCount = 0;
	  	crawArticleDetail(detailUrlArr,res);
	    return false;
	  });  	
  }

  // 获取某个时间段文章链接集合
  const getDetailUrlCollections = ($,startTime,endTime) => {
		let	articleList = $('#list-container .note-list li'),
				detailUrlCollections = [];
		for(let i = 0,len = articleList.length; i < len; i++) {
			let crateAt = articleList.eq(i).find('.author .time').attr('data-shared-at');
			let createTime = new Date(crateAt).getTime();
			if(createTime >= startTime && createTime <= endTime) {
				let articleUrl = articleList.eq(i).find('.title').attr('href');
	      let url = _baseUrl + articleUrl;
				detailUrlCollections.push(url);
			}
		}	
		return detailUrlCollections;
	}

	// 爬取文章详情
	const crawArticleDetail = (detailUrls,res) => {
		const detailUrlArr = spreadDetailUrl(detailUrls);
		async.mapLimit(detailUrlArr, 5, (url, callback) => { 
			_currentCount ++;
	    fetchUrl(url, (html) => {
	    	const $ = cheerio.load(html,{decodeEntities: false});
		    const  data = {
	    		title: $('.article .title').html(),
	    		wordage: $('.article .wordage').html(),
	    		publishTime: $('.article .publish-time').html(),
	    		author: $('.author .name a').html()
		    }; 
				callback(null,data);  
	    });
	   
	  }, (err, resData) => {
	  	let result = removeSame(resData);
	  	const sumUpData = sumUpResult(result);
	  	res.json({
	  		data: result,
	  		sumUpData: sumUpData
	  	});
	  	createExcel(result,sumUpData);
	  	console.info('抓取数据完毕，一共抓取了：'+ result.length +'篇文章，其中，错误数为：' + _errorUrls.length +'条');
	  	if(_errorUrls.length > 0) {
	  		console.info('错误的url为:' + _errorUrls.join(','));
	  	}
	    return false;
	  });
	}

  // [[abc,def],[hij,xxx]] => [abc,def,hij,xxx]
	const spreadDetailUrl= (urls) => {
		const urlCollections = [];
    urls.forEach((item) => {
	    item.forEach((url) => {
	    	urlCollections.push(url);
	    })
	  });		
		return urlCollections;
	}

  // 数组去重
	const removeSame = (arr) => {
		let arr2 = arr;
		const newArr = [];
		const obj = {};
		arr2.forEach((item) => {
	    if(!obj[item.title]) {
	      newArr.push(item);
	      obj[item.title] = item.title;
	    } 
	  });
	  return newArr;
	}

	// 提取数据:[{ name: '咸鱼老弟', num: 2, wordageNum: 3700 }]
	const sumUpResult = (dataArr) => {
		const obj = {},
		      arr = [];
	  dataArr.forEach((item,index) => {
	    const author = item.author;
	    const wordage = item.wordage.match(/\d+/g)[0];
	    if(obj[author]) {
	      obj[author].push(wordage);
	    } else {
	      obj[author] = [wordage];
	    }
	  });
	  for(let name in obj) {
	    const dataObj = {};
	    dataObj.name = name;
	    dataObj.num = obj[name].length;
	    dataObj.wordageNum = obj[name].reduce((count,v) => Number(count)+Number(v), 0);
	    arr.push(dataObj);
	  }
	  return arr;	
	}

	// 生成excel表
  const createExcel = (dataArr,sumUpData) => {
		const exlBuf = fs.readFileSync(config.excelFile.path + "/report.xlsx");
		//数据源
		const data = [ [{"table_name":"7班简书统计表","date": formatTime()}], dataArr, sumUpData ];
		//用数据源(对象)data渲染Excel模板
		ejsExcel.renderExcel(exlBuf, data)
		.then(function(exlBuf2) {
				fs.writeFileSync(config.excelFile.path + "/report2.xlsx", exlBuf2);
				console.log("生成excel表成功");
		}).catch(function(err) {
				console.error('生成excel表失败');
		});
  }

  const formatTime = () => {
    let timestamp = new Date();
    let y = timestamp.getFullYear();
    let mon = timestamp.getMonth() +1;
    let day = timestamp.getDate();
    mon = Number(mon) > 10 ? mon : '0'+mon;
    day = Number(mon) > 10 ? day : '0'+day;
    return y +'-' + mon + '-' + day; 
  }


  return crawlUserCenter;  // 抓取用户中心是入口

})();


// 爬虫构造函数
function Crawler(res,startTime,endTime) {
	this.baseUrl = "http://www.jianshu.com";
	this.currentCount = 0;
	this.res = res;
	this.errorUrls = [];
	this.startTime = startTime;
	this.endTime = endTime;
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
			  console.log('抓取【'+ url +'】出错');	
			  return false;    		
    	}
    	callback(ssres.text);
    });		
}

// 爬取用户中心,从中获取文章详情链接, 异步抓取，控制并发为5条
Crawler.prototype.crawlUserCenter = function() {
	var that = this;
	var centerUrlArr = config.data;
	async.mapLimit(centerUrlArr, 5, function (elem, callback) { 
		const url = elem.url;
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
		var fetchStart = new Date().getTime();
		console.log('现在正在抓取:',url,'现在的并发数为:' +that.currentCount);
    that.fetchUrl(url, function(html) {
    	const $ = cheerio.load(html,{decodeEntities: false});
    	var time = new Date().getTime() - fetchStart;
    	console.log("耗时：" +time);
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
  	var sumUpData = that.sumUpResult(result);
  	that.res.json({
  		data: result,
  		sumUpData: sumUpData
  	});
  	that.createExcel(result,sumUpData);
  	console.log('抓取数据完毕，一共抓取了：'+ result.length +'篇文章');
  	
    return false;
  });
}

/**
[{ name: '咸鱼老弟', num: 2, wordageNum: 3700 }]
**/
Crawler.prototype.sumUpResult = function(dataArr) {
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
Crawler.prototype.createExcel = function(dataArr,sumUpData) {
	const exlBuf = fs.readFileSync(config.excelFile.path + "/report.xlsx");
	//数据源
	var data = [ 
	   [{"table_name":"7班简书统计表","date": new Date()}],
	   dataArr,
	   sumUpData
	];
	//用数据源(对象)data渲染Excel模板
	ejsExcel.renderExcel(exlBuf, data)
	.then(function(exlBuf2) {
			fs.writeFileSync(config.excelFile.path + "/report2.xlsx", exlBuf2);
			console.log("生成excel表成功");
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
