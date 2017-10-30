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


const baseUrl = 'http://www.dytt8.net';  //迅雷首页链接
const newMovieLinkArr=[]; //存放新电影的url
const errLength=[];     //统计出错的链接数
const highScoreMovieArr=[] //高评分电影

/* GET users listing. */
router.get('/users', function(req, res, next) {
	res.render('index', { title: 'Express888' });
	// const baseUrl = 'http://www.jianshu.com/u/a022ff7e4bcd';
	// const crawler = new Crawler(baseUrl);
	// crawler.getUserCenter();
});


function Crawler(page) {
	this.page = page;
}
Crawler.prototype = {
	init: function() {
		this.getUserCenter();
	},
	// 先爬取用户中心
	getUserCenter: function() {
		const url = this.page;
		superagent
	    .get(page)
	    .charset('utf-8')
	    .end(function (err, res) {	 
	    	if(err) {
				console.log('抓取'+page+'这条信息的时候出错了')
            	return next(err);	    		
	    	}
	    	const $ = cheerio.load(res.text);
	    	console.log($);
	    });	
	}
}

// //先抓取迅雷首页
// (function (page) {
//     superagent
//     .get(page)
//     .charset('gb2312')
//     .end(function (err, sres) {
//         // 常规的错误处理
//         if (err) {
//           console.log('抓取'+page+'这条信息的时候出错了')
//             return next(err);
//         }
//         var $ = cheerio.load(sres.text);
//         // 170条电影链接，注意去重
//         getAllMovieLink($);
//         highScoreMovie($);
//         /*
//         *流程控制语句
//         *当首页左侧的链接爬取完毕之后，我们就开始爬取里面的详情页
//         */
//         ep.emit('get_topic_html', 'get '+page+' successful');
//     });
// })(baseUrl);


module.exports = router;
