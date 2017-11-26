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


/* GET users listing. */
router.get('/', function(req, res, next) {
	res.json({
    success:1,
    msg:"finish archive"
  });
});


module.exports = router;
